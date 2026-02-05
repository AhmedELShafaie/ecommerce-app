#!/usr/bin/env python3
import grpc
from concurrent import futures
import sqlite3
import uuid
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'generated'))
import user_pb2
import user_pb2_grpc

DB_PATH = os.path.join(os.path.dirname(__file__), 'users.db')


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL
        );
    """)
    conn.commit()
    conn.close()


class UserServicer(user_pb2_grpc.UserServiceServicer):
    def GetUser(self, request, context):
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        row = conn.execute('SELECT id, email, name FROM users WHERE id = ?', (request.id,)).fetchone()
        conn.close()
        if not row:
            context.set_code(grpc.StatusCode.NOT_FOUND)
            context.set_details('User not found')
            return user_pb2.User()
        return user_pb2.User(id=row['id'], email=row['email'], name=row['name'])

    def CreateUser(self, request, context):
        uid = str(uuid.uuid4())
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute(
                'INSERT INTO users (id, email, name) VALUES (?, ?, ?)',
                (uid, request.email, request.name)
            )
            conn.commit()
        except sqlite3.IntegrityError:
            context.set_code(grpc.StatusCode.ALREADY_EXISTS)
            context.set_details('Email already exists')
            return user_pb2.User()
        finally:
            conn.close()
        return user_pb2.User(id=uid, email=request.email, name=request.name)

    def ListUsers(self, request, context):
        page = max(1, request.page)
        page_size = min(100, max(1, request.page_size))
        offset = (page - 1) * page_size
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            'SELECT id, email, name FROM users ORDER BY id LIMIT ? OFFSET ?',
            (page_size, offset)
        ).fetchall()
        total = conn.execute('SELECT COUNT(*) FROM users').fetchone()[0]
        conn.close()
        users = [user_pb2.User(id=r['id'], email=r['email'], name=r['name']) for r in rows]
        return user_pb2.ListUsersResponse(users=users, total=total)


def serve():
    init_db()
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    user_pb2_grpc.add_UserServiceServicer_to_server(UserServicer(), server)
    server.add_insecure_port('[::]:50053')
    server.start()
    print('User service listening on :50053')
    server.wait_for_termination()


if __name__ == '__main__':
    serve()
