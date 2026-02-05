# E-Commerce Microservices (gRPC + Protobuf)

A multi-service e-commerce app with **4 microservices** on **3 stacks** (Go, Node.js, Python), gRPC/protobuf between services, SQLite per service, and a REST API gateway + simple frontend.

## Architecture

| Service          | Stack      | Port  | Database | Role                          |
|------------------|------------|-------|----------|-------------------------------|
| **product-service** | Go         | 50051 | SQLite   | Product catalog, prices       |
| **order-service**  | Node.js/TS | 50052 | SQLite   | Orders                        |
| **user-service**   | Python     | 50053 | SQLite   | Users                         |
| **cart-service**   | Node.js/TS | 50054 | SQLite   | Cart; calls Product via gRPC |
| **api-gateway**    | Node.js/TS | 3000  | -        | REST → gRPC, serves frontend  |

- **product-service**: gRPC server (ProductService).
- **order-service**: gRPC server (OrderService).
- **user-service**: gRPC server (UserService).
- **cart-service**: gRPC server (CartService) and gRPC **client** to Product service to resolve product name/price when adding items.
- **api-gateway**: REST API and static frontend; translates REST to gRPC calls to the four backends.

## Proto definitions

Shared protos live in `proto/`:

- `product.proto` – Product, ProductService
- `user.proto` – User, UserService  
- `cart.proto` – Cart, CartService
- `order.proto` – Order, OrderService

## Run locally (without Docker)

You need **Go**, **Node.js** (npm), and **Python 3** with venv.

1. **Product service (Go)**  
   ```bash
   cd product-service && go build -o bin/product-service . && ./bin/product-service
   ```

2. **Order service (Node)**  
   ```bash
   cd order-service && npm install && npm run build && npm start
   ```

3. **User service (Python)**  
   ```bash
   cd user-service && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt
   ./venv/bin/python -m grpc_tools.protoc -I../proto --python_out=./generated --grpc_python_out=./generated ../proto/user.proto
   ./venv/bin/python server.py
   ```

4. **Cart service (Node)**  
   ```bash
   cd cart-service && npm install && npm run build && npm start
   ```
   (Product service must be running for AddItem to resolve products.)

5. **API Gateway**  
   ```bash
   cd api-gateway && npm install && npm run build && npm start
   ```

6. Open **http://localhost:3000** for the frontend.

## Run with Docker Compose

From the repo root:

```bash
docker-compose up --build
```

- Product: 50051  
- Order: 50052  
- User: 50053  
- Cart: 50054  
- Gateway (and UI): **http://localhost:3000**

## Scripts (local runs)

From the repo root:

- **Start all services** (Go, Node, Python in background; Ctrl+C stops them):
  ```bash
  chmod +x scripts/run-all.sh
  ./scripts/run-all.sh
  ```

- **Full gRPC test flow** (create product, user, add to cart, create order; requires [grpcurl](https://github.com/fullstorydev/grpcurl)):
  ```bash
  chmod +x scripts/test-grpc.sh
  ./scripts/test-grpc.sh
  ```
  Use `GRPC_HOST=hostname` if services are not on localhost.

## Testing

- **grpcurl**: direct gRPC calls to each service.  
- **cURL**: REST calls to the gateway at `http://localhost:3000/api`.  
- **Frontend**: http://localhost:3000 (create products/users, add to cart, place orders).

See **[TESTING.md](./TESTING.md)** for step-by-step grpcurl and cURL scenarios and a full flow example.

## Project layout

```
ecommerce-app/
├── proto/              # Shared .proto files
├── product-service/    # Go, gRPC server, SQLite
├── order-service/      # Node/TS, gRPC server, SQLite
├── user-service/       # Python, gRPC server, SQLite
├── cart-service/       # Node/TS, gRPC server + Product client, SQLite
├── api-gateway/        # Node/TS, REST → gRPC, static frontend
├── scripts/
│   ├── run-all.sh      # Start all services locally
│   └── test-grpc.sh    # Full grpcurl test flow
├── docker-compose.yml
├── README.md
└── TESTING.md
```
