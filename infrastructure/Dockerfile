FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY tsconfig.services.json ./
COPY services ./services
RUN npm run build:services
ENV NODE_ENV=production PORT=4000
USER node
EXPOSE 4000
CMD ["npm", "run", "start:service"]
