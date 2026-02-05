cd /home/ubuntu/ecommerce-app && mkdir -p .protoc && (curl -sL -o .protoc/protoc.zip "https://github.com/protocolbuffers/protobuf/releases/download/v28.2/protoc-28.2-linux-aarch_64.zip" 2>/dev/null || curl -sL -o .protoc/protoc.zip "https://github.com/protocolbuffers/protobuf/releases/download/v27.3/protoc-27.3-linux-aarch_64.zip" 2>/dev/null) && unzip -o -q .protoc/protoc.zip -d .protoc && ls -la .protoc/bin/


export PATH="$HOME/go/bin:$PATH"; cd /home/ubuntu/ecommerce-app/product-service && /home/ubuntu/ecommerce-app/.protoc/bin/protoc -I ../proto --go_out=. --go_opt=module=product-service --go-grpc_out=. --go-grpc_opt=module=product-service ../proto/product.proto 2>&1






cd /home/ubuntu/ecommerce-app/product-service && go build -o bin/product-service . 2>&1

cd /home/ubuntu/ecommerce-app/product-service && go mod tidy && go build -o bin/product-service . 2>&1

cd /home/ubuntu/ecommerce-app && go install google.golang.org/protobuf/cmd/protoc-gen-go@latest && go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest 2>&1



cd /home/ubuntu/ecommerce-app/user-service && python3 -m grpc_tools.protoc -I../proto --python_out=./generated --grpc_python_out=./generated ../proto/user.proto 2>&1


pip3 install --user grpcio grpcio-tools protobuf 2>&1

cd /home/ubuntu/ecommerce-app/user-service && python3 -m venv venv && ./venv/bin/pip install grpcio grpcio-tools protobuf && ./venv/bin/python -m grpc_tools.protoc -I../proto --python_out=./generated --grpc_python_out=./generated ../proto/user.proto 2>&1



mkdir -p /home/ubuntu/ecommerce-app/user-service/generated && cd /home/ubuntu/ecommerce-app/user-service && ./venv/bin/python -m grpc_tools.protoc -I../proto --python_out=./generated --grpc_python_out=./generated ../proto/user.proto 2>&1


cd /home/ubuntu/ecommerce-app/order-service && npm install 2>&1 && npm run build 2>&1

cd /home/ubuntu/ecommerce-app/cart-service && npm install 2>&1 && npm run build 2>&1

cd /home/ubuntu/ecommerce-app/api-gateway && npm install 2>&1 && npm run build 2>&1


cd /home/ubuntu/ecommerce-app/api-gateway && npm install 2>&1 && npm run build 2>&1



/*
@types/uuid is now in order-service’s devDependencies, and the project builds successfully.
If you run ./scripts/run-all.sh again, it will use the existing node_modules and the build should complete without that error.
*/