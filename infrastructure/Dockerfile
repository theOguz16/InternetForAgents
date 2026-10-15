FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
# file: bağımlılığının hedefi kurulumda bulunmalı; aksi halde npm kopuk bağlantıyı gizleyebilir.
COPY packages/code-demo-contracts ./packages/code-demo-contracts
RUN npm ci --ignore-scripts --no-audit --no-fund \
    && node -e "require('@ifa/code-demo-contracts')"
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
