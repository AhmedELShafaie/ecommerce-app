FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY product-service/go.mod product-service/go.sum ./
RUN go mod download
COPY product-service/ ./
COPY proto/ ./proto/
RUN CGO_ENABLED=1 go build -o bin/product-service .

FROM alpine:3.19
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=builder /app/bin/product-service .
COPY --from=builder /app/pb ./pb
EXPOSE 50051
CMD ["./product-service"]
# Note: pb is generated; ensure product-service/pb exists when building
