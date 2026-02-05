# E-Commerce Microservices - Testing Scenarios

Test gRPC services with **grpcurl** and the REST API with **cURL**. Start all services first (see README).

## Quick automated gRPC flow

From repo root, with all services running:

```bash
./scripts/test-grpc.sh
```

This runs: create product → create user → get cart → add to cart → get cart → create order → get order → list orders. Use `GRPC_HOST=host` if services are not on localhost.

## Prerequisites

- **grpcurl**: install from https://github.com/fullstorydev/grpcurl
- Services: Product :50051, Order :50052, User :50053, Cart :50054, API Gateway :3000

---

## 1. Product Service (grpcurl)

```bash
grpcurl -plaintext localhost:50051 list
grpcurl -plaintext -d '{"name":"Laptop","description":"Gaming laptop","price":999.99,"stock":10}' \
  localhost:50051 product.ProductService/CreateProduct
grpcurl -plaintext -d '{"page":1,"page_size":10}' \
  localhost:50051 product.ProductService/ListProducts
grpcurl -plaintext -d '{"id":"PRODUCT_ID"}' \
  localhost:50051 product.ProductService/GetProduct
```

---

## 2. User Service (grpcurl)

```bash
grpcurl -plaintext -d '{"email":"alice@example.com","name":"Alice"}' \
  localhost:50053 user.UserService/CreateUser
grpcurl -plaintext -d '{"page":1,"page_size":10}' \
  localhost:50053 user.UserService/ListUsers
grpcurl -plaintext -d '{"id":"USER_ID"}' \
  localhost:50053 user.UserService/GetUser
```

---

## 3. Cart Service (grpcurl)

Use valid USER_ID and PRODUCT_ID from above. AddItem calls Product service via gRPC.

```bash
grpcurl -plaintext -d '{"user_id":"USER_ID"}' \
  localhost:50054 cart.CartService/GetCart
grpcurl -plaintext -d '{"user_id":"USER_ID","product_id":"PRODUCT_ID","quantity":2}' \
  localhost:50054 cart.CartService/AddItem
grpcurl -plaintext -d '{"user_id":"USER_ID"}' \
  localhost:50054 cart.CartService/GetCart
grpcurl -plaintext -d '{"user_id":"USER_ID","product_id":"PRODUCT_ID"}' \
  localhost:50054 cart.CartService/RemoveItem
grpcurl -plaintext -d '{"user_id":"USER_ID"}' \
  localhost:50054 cart.CartService/ClearCart
```

---

## 4. Order Service (grpcurl)

```bash
grpcurl -plaintext -d '{"user_id":"USER_ID","items":[{"product_id":"PRODUCT_ID","product_name":"Laptop","quantity":1,"unit_price":999.99}],"total":999.99}' \
  localhost:50052 order.OrderService/CreateOrder
grpcurl -plaintext -d '{"id":"ORDER_ID"}' \
  localhost:50052 order.OrderService/GetOrder
grpcurl -plaintext -d '{"user_id":"USER_ID","page":1,"page_size":10}' \
  localhost:50052 order.OrderService/ListOrdersByUser
```

---

## 5. REST API (cURL) - API Gateway

Base URL: http://localhost:3000/api

**Products:**
```bash
curl -s http://localhost:3000/api/products?page=1\&page_size=10
curl -s http://localhost:3000/api/products/PRODUCT_ID
curl -s -X POST http://localhost:3000/api/products -H "Content-Type: application/json" \
  -d '{"name":"Keyboard","description":"Mechanical","price":89.99,"stock":50}'
```

**Users:**
```bash
curl -s http://localhost:3000/api/users?page=1\&page_size=10
curl -s -X POST http://localhost:3000/api/users -H "Content-Type: application/json" \
  -d '{"email":"bob@example.com","name":"Bob"}'
```

**Cart:**
```bash
curl -s http://localhost:3000/api/cart/USER_ID
curl -s -X POST http://localhost:3000/api/cart/USER_ID/items -H "Content-Type: application/json" \
  -d '{"product_id":"PRODUCT_ID","quantity":2}'
curl -s -X DELETE http://localhost:3000/api/cart/USER_ID/items/PRODUCT_ID
curl -s -X DELETE http://localhost:3000/api/cart/USER_ID
```

**Orders:**
```bash
curl -s -X POST http://localhost:3000/api/orders -H "Content-Type: application/json" \
  -d '{"user_id":"USER_ID","items":[{"product_id":"p1","product_name":"Laptop","quantity":1,"unit_price":999.99}],"total":999.99}'
curl -s http://localhost:3000/api/orders/ORDER_ID
curl -s "http://localhost:3000/api/orders/user/USER_ID?page=1&page_size=10"
```

---

## 6. Frontend

Open http://localhost:3000 in a browser. Use the UI to create products, users, add to cart, and place orders.
