#!/usr/bin/env bash
# Run all e-commerce microservices locally (from repo root).
# Requires: Go, Node.js (npm), Python 3 with venv.
# Stop with: pkill -f "product-service|order-service|cart-service|api-gateway" or kill the Python server.

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

log() { echo "[$(date +%H:%M:%S)] $*"; }

# Check prerequisites
command -v go    >/dev/null 2>&1 || { log "Missing: go";   exit 1; }
command -v node >/dev/null 2>&1 || { log "Missing: node"; exit 1; }
command -v npm   >/dev/null 2>&1 || { log "Missing: npm"; exit 1; }
command -v python3 >/dev/null 2>&1 || { log "Missing: python3"; exit 1; }

cleanup() {
  log "Stopping services..." log "Stopping services..."
  for pid in "${PIDS[@]}"; do kill "$pid" 2>/dev/null || true; done
  exit 0
}
trap cleanup SIGINT SIGTERM
PIDS=()

# 1. Product service (Go)
log "Starting product-service (Go) on :50051"
(cd "$ROOT/product-service" && ./bin/product-service 2>&1 | sed 's/^/  [product] /') &
PIDS+=($!)

sleep 1

# 2. Order service (Node)
if [ ! -d "$ROOT/order-service/node_modules" ]; then
  log "Installing order-service deps..."
  (cd "$ROOT/order-service" && npm install --silent && npm run build)
fi
log "Starting order-service (Node) on :50052"
(cd "$ROOT/order-service" && node dist/index.js 2>&1 | sed 's/^/  [order] /') &
PIDS+=($!)

sleep 0.5

# 3. User service (Python)
if [ ! -d "$ROOT/user-service/venv" ]; then
  log "Creating user-service venv and generating proto..."
  (cd "$ROOT/user-service" && python3 -m venv venv && ./venv/bin/pip install -q -r requirements.txt)
  (cd "$ROOT/user-service" && ./venv/bin/python -m grpc_tools.protoc -I../proto --python_out=./generated --grpc_python_out=./generated ../proto/user.proto)
fi
log "Starting user-service (Python) on :50053"
(cd "$ROOT/user-service" && ./venv/bin/python server.py 2>&1 | sed 's/^/  [user] /') &
PIDS+=($!)

sleep 0.5

# 4. Cart service (Node)
if [ ! -d "$ROOT/cart-service/node_modules" ]; then
  log "Installing cart-service deps..."
  (cd "$ROOT/cart-service" && npm install --silent && npm run build)
fi
log "Starting cart-service (Node) on :50054"
(cd "$ROOT/cart-service" && node dist/index.js 2>&1 | sed 's/^/  [cart] /') &
PIDS+=($!)

sleep 0.5

# 5. API Gateway (Node)
if [ ! -d "$ROOT/api-gateway/node_modules" ]; then
  log "Installing api-gateway deps..."
  (cd "$ROOT/api-gateway" && npm install --silent && npm run build)
fi
log "Starting api-gateway on :3000"
(cd "$ROOT/api-gateway" && node dist/index.js 2>&1 | sed 's/^/  [gateway] /') &
PIDS+=($!)

log "All services started. Frontend: http://localhost:3000"
log "Press Ctrl+C to stop all."
wait
