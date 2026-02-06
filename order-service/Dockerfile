FROM node:20-alpine AS builder
WORKDIR /app

COPY order-service/package*.json ./
RUN npm ci

COPY order-service/tsconfig.json ./
COPY order-service/src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app

COPY order-service/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY proto/ ./proto/

EXPOSE 50052
CMD ["node", "dist/index.js"]
