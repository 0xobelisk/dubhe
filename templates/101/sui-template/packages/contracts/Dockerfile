FROM node:18-alpine

WORKDIR /app

RUN npm install @0xobelisk/sui-indexer@latest

COPY . .

RUN mkdir -p /app/.data && chmod 777 /app/.data

EXPOSE 3001

CMD ["npx", "sqlite-indexer", "--network", "testnet", "--sqlite-filename", "/app/.data/indexer.db", "--pagination-limit", "9999"]
