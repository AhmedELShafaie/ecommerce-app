.PHONY: proto build run

PROTOC ?= protoc
proto:
	mkdir -p pb
	$(PROTOC) -I ../proto --go_out=. --go_opt=module=product-service --go-grpc_out=. --go-grpc_opt=module=product-service ../proto/product.proto

build:
	go build -o bin/product-service .

run: build
	./bin/product-service
