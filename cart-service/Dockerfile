FROM node:20-alpine
WORKDIR /app
COPY cart-service/package*.json ./
RUN npm ci --omit=dev
COPY cart-service/tsconfig.json ./
COPY cart-service/src ./src
COPY proto/ ./proto/
RUN npm run build
EXPOSE 50054
CMD ["node", "dist/index.js"]
