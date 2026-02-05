package main

import (
	"database/sql"
	"log"
	"net"

	"product-service/pb"

	_ "modernc.org/sqlite"
	"google.golang.org/grpc"
)

func main() {
	db, err := sql.Open("sqlite", "file:products.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS products (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			description TEXT,
			price REAL NOT NULL,
			stock INTEGER NOT NULL
		)
	`)
	if err != nil {
		log.Fatal(err)
	}

	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatal(err)
	}
	srv := grpc.NewServer()
	pb.RegisterProductServiceServer(srv, &productServer{db: db})
	log.Println("Product service listening on :50051")
	if err := srv.Serve(lis); err != nil {
		log.Fatal(err)
	}
}
