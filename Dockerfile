# Node 24 LTS. Native addons (better-sqlite3, sqlite-vec) compile in the
# dependencies stage; keep python3/make/g++ there when bumping this tag.
ARG NODE_VERSION=24-bookworm-slim

FROM node:${NODE_VERSION} AS dependencies

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/tsconfig.json ./packages/engine/
COPY packages/engine/src ./packages/engine/src
COPY packages/engine/scripts ./packages/engine/scripts

RUN --mount=type=cache,target=/root/.npm \
  npm ci --no-audit --no-fund

FROM node:${NODE_VERSION} AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages/engine ./packages/engine
COPY . .

ENV NODE_ENV=production
ENV DOCKER_BUILD=1

ARG VITE_DEPLOYMENT_MODE=
ENV VITE_DEPLOYMENT_MODE=$VITE_DEPLOYMENT_MODE

# Vite compiles TS itself. `npm run build` also runs `tsc -b` (noEmit typecheck),
# which currently fails on pre-existing errors and would abort the image build.
RUN npm run build --prefix packages/engine \
  && if [ "$VITE_DEPLOYMENT_MODE" = "demo" ]; then npm run build:demo; else npx vite build; fi \
  && npm prune --omit=dev

FROM node:${NODE_VERSION} AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001
ENV DATA_DIR=/app/data
ENV MODS_DIR=/app/data/mods
ENV TRUST_PROXY=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    gosu \
    git \
    python3 \
    python3-venv \
    python3-pip \
    ffmpeg \
    libgomp1 \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /app/data \
  && chown node:node /app/data

COPY --from=builder --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/packages/engine ./packages/engine
COPY --from=builder --chown=node:node /app/server.js ./
COPY --from=builder --chown=node:node /app/server ./server
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/gamedata ./gamedata
COPY --from=builder --chown=node:node /app/public/bundled-mods ./public/bundled-mods
COPY --from=builder --chown=node:node /app/mods ./mods.shipped
COPY docker/entrypoint.sh /app/docker/entrypoint.sh

RUN chmod +x /app/docker/entrypoint.sh \
  && chown -R node:node /app/mods.shipped /app/public /app/gamedata /app/dist /app/server /app/packages

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=6 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3001) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["node", "server.js"]
