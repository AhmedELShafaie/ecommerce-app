#!/usr/bin/env bash
# Run a full gRPC flow: create product, user, add to cart, create order.
# Requires: grpcurl (and optionally jq for parsing JSON).
# Start services first: ./scripts/run-all.sh or docker-compose up

set -e
HOST="${GRPC_HOST:-localhost}"

grpc() {
  grpcurl -plaintext -d "$1" "$HOST:$2" "$3"
}

# Extract field (e.g. id) from grpcurl JSON output
id_of() {
  local text="$1" key="$2"
  if command -v jq >/dev/null 2>&1; then
    echo "$text" | jq -r ".${key} // empty"
    return
  fi
  echo "$text" | grep -oE "\"${key}\"[[:space:]]*:[[:space:]]*\"[^\"]+\"" | sed 's/.*: *"\([^"]*\)".*/\1/' | head -1
}

echo "=== 1. Create product ==="
PRODUCT_RESP=$(grpc '{"name":"Test Widget","description":"A widget","price":29.99,"stock":50}' 50051 product.ProductService/CreateProduct)
echo "$PRODUCT_RESP"
PRODUCT_ID=$(id_of "$PRODUCT_RESP" "id")
echo "PRODUCT_ID=$PRODUCT_ID"
echo

echo "=== 2. Create user ==="
USER_RESP=$(grpc '{"email":"test@example.com","name":"Test User"}' 50053 user.UserService/CreateUser)
echo "$USER_RESP"
USER_ID=$(id_of "$USER_RESP" "id")
echo "USER_ID=$USER_ID"
echo

echo "=== 3. Get empty cart ==="
grpc "{\"user_id\":\"$USER_ID\"}" 50054 cart.CartService/GetCart
echo

echo "=== 4. Add item to cart (cart calls Product service) ==="
grpc "{\"user_id\":\"$USER_ID\",\"product_id\":\"$PRODUCT_ID\",\"quantity\":3}" 50054 cart.CartService/AddItem
echo

echo "=== 5. Get cart (with items and total) ==="
CART=$(grpc "{\"user_id\":\"$USER_ID\"}" 50054 cart.CartService/GetCart)
echo "$CART"
echo

echo "=== 6. Create order (using same items/total as cart) ==="
# Build order payload: user_id, items array, total (simplified: one item)
ORDER_PAYLOAD=$(cat <<EOF
{"user_id":"$USER_ID","items":[{"product_id":"$PRODUCT_ID","product_name":"Test Widget","quantity":3,"unit_price":29.99}],"total":89.97}
EOF
)
ORDER_RESP=$(grpc "$ORDER_PAYLOAD" 50052 order.OrderService/CreateOrder)
echo "$ORDER_RESP"
ORDER_ID=$(id_of "$ORDER_RESP" "id")
echo "ORDER_ID=$ORDER_ID"
echo

echo "=== 7. Get order by ID ==="
grpc "{\"id\":\"$ORDER_ID\"}" 50052 order.OrderService/GetOrder
echo

echo "=== 8. List orders by user ==="
grpc "{\"user_id\":\"$USER_ID\",\"page\":1,\"page_size\":10}" 50052 order.OrderService/ListOrdersByUser
echo

echo "=== 9. List products ==="
grpc '{"page":1,"page_size":5}' 50051 product.ProductService/ListProducts
echo

echo "=== 10. Get product price (Product service) ==="
grpc "{\"id\":\"$PRODUCT_ID\"}" 50051 product.ProductService/GetProductPrice
echo

echo "Done. PRODUCT_ID=$PRODUCT_ID USER_ID=$USER_ID ORDER_ID=$ORDER_ID"
