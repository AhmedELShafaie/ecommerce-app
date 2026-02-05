import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

const protoDir = process.env.PROTO_DIR || path.resolve(process.cwd(), '..', 'proto');
const PROTO_PATH = path.join(protoDir, 'order.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const orderProto = grpc.loadPackageDefinition(packageDefinition).order as any;

const db = new Database('orders.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS order_items (
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );
`);

function createOrder(call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) {
  try {
    const { user_id, items, total } = call.request;
    const id = uuidv4();
    const created_at = new Date().toISOString();
    const insertOrder = db.prepare(
      'INSERT INTO orders (id, user_id, total, status, created_at) VALUES (?, ?, ?, ?, ?)'
    );
    insertOrder.run(id, user_id, total, 'PENDING', created_at);
    const insertItem = db.prepare(
      'INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)'
    );
    for (const item of items || []) {
      insertItem.run(id, item.product_id, item.product_name, item.quantity, item.unit_price);
    }
    callback(null, {
      id,
      user_id,
      items: items || [],
      total,
      status: 'PENDING',
      created_at,
    });
  } catch (err: any) {
    callback({ code: grpc.status.INTERNAL, message: err.message }, null);
  }
}

function getOrder(call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) {
  try {
    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(call.request.id) as any;
    if (!row) {
      return callback({ code: grpc.status.NOT_FOUND, message: 'Order not found' }, null);
    }
    const items = db
      .prepare(
        'SELECT product_id, product_name, quantity, unit_price FROM order_items WHERE order_id = ?'
      )
      .all(row.id) as any[];
    callback(null, {
      id: row.id,
      user_id: row.user_id,
      items: items.map((i) => ({
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
      total: row.total,
      status: row.status,
      created_at: row.created_at,
    });
  } catch (err: any) {
    callback({ code: grpc.status.INTERNAL, message: err.message }, null);
  }
}

function listOrdersByUser(call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) {
  try {
    const { user_id, page = 1, page_size = 10 } = call.request;
    const offset = (page - 1) * page_size;
    const rows = db
      .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(user_id, page_size, offset) as any[];
    const countRow = db.prepare('SELECT COUNT(*) as total FROM orders WHERE user_id = ?').get(user_id) as { total: number };
    const orders = rows.map((row) => {
      const items = db
        .prepare(
          'SELECT product_id, product_name, quantity, unit_price FROM order_items WHERE order_id = ?'
        )
        .all(row.id) as any[];
      return {
        id: row.id,
        user_id: row.user_id,
        items: items.map((i) => ({
          product_id: i.product_id,
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
        total: row.total,
        status: row.status,
        created_at: row.created_at,
      };
    });
    callback(null, { orders, total: countRow?.total ?? 0 });
  } catch (err: any) {
    callback({ code: grpc.status.INTERNAL, message: err.message }, null);
  }
}

const server = new grpc.Server();
server.addService(orderProto.OrderService.service, {
  CreateOrder: createOrder,
  GetOrder: getOrder,
  ListOrdersByUser: listOrdersByUser,
});
server.bindAsync(
  '0.0.0.0:50052',
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log('Order service listening on :50052');
  }
);
