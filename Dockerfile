# ---- Build stage: install deps, build the React app ----
FROM node:22-slim AS build
WORKDIR /app

# Toolchain in case better-sqlite3 has no prebuilt binary for the platform.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

# ---- Runtime stage: one Node process serves the API and the built frontend ----
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/data/app.db

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist

RUN mkdir -p /data && chown -R node:node /data
USER node
VOLUME /data
EXPOSE 3000

CMD ["node", "server/src/index.js"]
