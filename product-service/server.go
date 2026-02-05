package main

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"product-service/pb"
)

type productServer struct {
	pb.UnimplementedProductServiceServer
	db *sql.DB
}

// Ensure productServer implements ProductServiceServer
var _ pb.ProductServiceServer = (*productServer)(nil)

func (s *productServer) GetProduct(ctx context.Context, req *pb.GetProductRequest) (*pb.Product, error) {
	var p pb.Product
	err := s.db.QueryRowContext(ctx,
		"SELECT id, name, description, price, stock FROM products WHERE id = ?",
		req.Id,
	).Scan(&p.Id, &p.Name, &p.Description, &p.Price, &p.Stock)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("product not found")
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *productServer) ListProducts(ctx context.Context, req *pb.ListProductsRequest) (*pb.ListProductsResponse, error) {
	page := req.Page
	if page < 1 {
		page = 1
	}
	pageSize := req.PageSize
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}
	offset := (page - 1) * pageSize

	rows, err := s.db.QueryContext(ctx,
		"SELECT id, name, description, price, stock FROM products ORDER BY id LIMIT ? OFFSET ?",
		pageSize, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []*pb.Product
	for rows.Next() {
		var p pb.Product
		if err := rows.Scan(&p.Id, &p.Name, &p.Description, &p.Price, &p.Stock); err != nil {
			return nil, err
		}
		products = append(products, &p)
	}

	var total int32
	_ = s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM products").Scan(&total)
	return &pb.ListProductsResponse{Products: products, Total: total}, nil
}

func (s *productServer) CreateProduct(ctx context.Context, req *pb.CreateProductRequest) (*pb.Product, error) {
	id := uuid.New().String()
	_, err := s.db.ExecContext(ctx,
		"INSERT INTO products (id, name, description, price, stock) VALUES (?, ?, ?, ?, ?)",
		id, req.Name, req.Description, req.Price, req.Stock,
	)
	if err != nil {
		return nil, err
	}
	return &pb.Product{
		Id:          id,
		Name:        req.Name,
		Description: req.Description,
		Price:       req.Price,
		Stock:       req.Stock,
	}, nil
}

func (s *productServer) GetProductPrice(ctx context.Context, req *pb.GetProductPriceRequest) (*pb.ProductPrice, error) {
	var price float64
	var stock int32
	err := s.db.QueryRowContext(ctx, "SELECT price, stock FROM products WHERE id = ?", req.Id).Scan(&price, &stock)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("product not found")
	}
	if err != nil {
		return nil, err
	}
	return &pb.ProductPrice{Id: req.Id, Price: price, Stock: stock}, nil
}
