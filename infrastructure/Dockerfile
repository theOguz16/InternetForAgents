FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY tsconfig.services.json ./
COPY services ./services
COPY web ./web
RUN npm run build
ENV NODE_ENV=production PORT=4000
RUN mkdir -p /app/data && chown node:node /app/data
ENV DATA_DIR=/app/data
USER node
EXPOSE 4000
CMD ["npm", "run", "start:service"]
