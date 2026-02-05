FROM node:20-alpine
WORKDIR /app
COPY order-service/package*.json ./
RUN npm ci --omit=dev
COPY order-service/tsconfig.json ./
COPY order-service/src ./src
COPY proto/ ./proto/
RUN npm run build
EXPOSE 50052
CMD ["node", "dist/index.js"]
