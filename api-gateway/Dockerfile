FROM node:20-alpine AS builder
WORKDIR /app

COPY api-gateway/package*.json ./
RUN npm ci

COPY api-gateway/tsconfig.json ./
COPY api-gateway/src ./src
COPY api-gateway/public ./public
RUN npm run build

FROM node:20-alpine
WORKDIR /app

COPY api-gateway/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY proto/ ./proto/

EXPOSE 3000
CMD ["node", "dist/index.js"]
