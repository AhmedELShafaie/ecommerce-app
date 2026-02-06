FROM node:20-alpine AS builder
WORKDIR /app

COPY cart-service/package*.json ./
RUN npm ci

COPY cart-service/tsconfig.json ./
COPY cart-service/src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app

COPY cart-service/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY proto/ ./proto/

EXPOSE 50054
CMD ["node", "dist/index.js"]
