# Node 24 LTS. Native addons (better-sqlite3, sqlite-vec) compile in the
# dependencies stage; keep python3/make/g++ there when bumping this tag.
ARG NODE_VERSION=24-bookworm-slim

FROM node:${NODE_VERSION} AS dependencies

WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/tsconfig.json ./packages/engine/

# --ignore-scripts skips engine `prepare` (tsc) so lockfile-only layers stay
# valid when engine source changes. Rebuild natives + prebuilds explicitly.
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/root/.cache/node-gyp \
    npm ci --ignore-scripts --no-audit --no-fund \
    && npm rebuild better-sqlite3 sqlite-vec sharp onnxruntime-node

COPY packages/engine/src ./packages/engine/src
COPY packages/engine/scripts ./packages/engine/scripts
RUN npx tsc -p packages/engine/tsconfig.json

FROM node:${NODE_VERSION} AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages/engine ./packages/engine
COPY --from=dependencies /app/package.json /app/package-lock.json ./

# Vite inputs only — do not COPY packages/engine (would wipe dist from deps).
COPY vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json index.html ./
COPY src ./src
COPY public ./public
COPY mechanics ./mechanics
COPY gamedata ./gamedata
COPY docs/MODDING.md ./docs/MODDING.md

ENV NODE_ENV=production
ENV DOCKER_BUILD=1

# Production / Coolify images are the public Player demo. Local full-app
# builds must pass VITE_DEPLOYMENT_MODE= (empty) via docker-compose.yml.
ARG VITE_DEPLOYMENT_MODE=demo
ENV VITE_DEPLOYMENT_MODE=$VITE_DEPLOYMENT_MODE

COPY .env.demo ./

# Vite compiles TS itself. `npm run build` also runs `tsc -b` (noEmit typecheck),
# which currently fails on pre-existing errors and would abort the image build.
# Engine is already built in the dependencies stage.
# Engine `prepare` is `tsc`; prune would re-run it after removing typescript.
# Echo the mode so this layer cannot cache-hit a previous full-app dist.
RUN --mount=type=cache,target=/app/node_modules/.vite \
    echo "VITE_DEPLOYMENT_MODE=${VITE_DEPLOYMENT_MODE}" \
    && if [ "$VITE_DEPLOYMENT_MODE" = "demo" ]; then npm run build:demo; else npx vite build; fi \
    && printf '%s\n' "${VITE_DEPLOYMENT_MODE:-full}" > dist/deployment-mode.txt \
    && npm prune --omit=dev --ignore-scripts

# Runtime files after Vite so server/mod edits do not bust the compile layer.
COPY server.js ./
COPY server ./server
COPY mods ./mods

FROM node:${NODE_VERSION} AS runner

WORKDIR /app

ARG VITE_DEPLOYMENT_MODE=demo
ARG DEMO_MODE=1
ARG TTS_DISABLED=1

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001
ENV DATA_DIR=/app/data
ENV MODS_DIR=/app/data/mods
ENV TRUST_PROXY=1
ENV VITE_DEPLOYMENT_MODE=$VITE_DEPLOYMENT_MODE
ENV DEMO_MODE=$DEMO_MODE
ENV TTS_DISABLED=$TTS_DISABLED

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    gosu \
    git \
    python3-venv \
    ffmpeg \
    libgomp1 \
  && apt-get clean && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /app/data \
  && chown node:node /app/data

# python3-pip pulls python3; keep this layer slim for Chatterbox sidecar pip.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3-pip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY --from=builder --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/packages/engine ./packages/engine
COPY --from=builder --chown=node:node /app/server.js ./
COPY --from=builder --chown=node:node /app/server ./server
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/gamedata ./gamedata
COPY --from=builder --chown=node:node /app/public/bundled-mods ./public/bundled-mods
COPY --from=builder --chown=node:node /app/mods ./mods.shipped
# nlp.js ESM-imports this at runtime; Vite inlines it for the frontend only.
COPY --from=builder --chown=node:node /app/src/data/titles.json ./src/data/titles.json
COPY docker/entrypoint.sh /app/docker/entrypoint.sh

RUN chmod +x /app/docker/entrypoint.sh \
  && chown -R node:node /app/mods.shipped /app/public /app/gamedata /app/dist /app/server /app/packages /app/src

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=6 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3001) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["node", "server.js"]
