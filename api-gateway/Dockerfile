FROM node:20-alpine
WORKDIR /app
COPY api-gateway/package*.json ./
RUN npm ci --omit=dev
COPY api-gateway/tsconfig.json ./
COPY api-gateway/src ./src
COPY api-gateway/public ./public
COPY proto/ ./proto/
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/index.js"]
