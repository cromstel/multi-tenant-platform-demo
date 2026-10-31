# syntax=docker/dockerfile:1
#
# Production image for CITGROUP TENANCY SYSTEM.
#
# Multi-stage: the build stage produces a minimal standalone server, the
# runtime stage carries only what is needed to serve it. The runtime image
# does not contain the source, the dev dependencies or the toolchain.

# ──────────────────────────────── deps ────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# pnpm is pinned by the `packageManager` field. `corepack enable` activates
# that exact version rather than whatever is latest.
RUN corepack enable

# The lockfile is copied on its own so the dependency layer is cached until
# the dependencies themselves change.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ─────────────────────────────── build ───────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable

# `NEXT_PUBLIC_*` values are inlined into the client bundle at build time,
# so they cannot be fixed with a runtime env var. This has to match the
# domain the app is served from, or client-rendered tenant URLs fall back
# to `localhost`. `.dockerignore` excludes `.env*`, so this is the only
# channel into the build.
ARG NEXT_PUBLIC_ROOT_DOMAIN=localhost:3030
ENV NEXT_PUBLIC_ROOT_DOMAIN=$NEXT_PUBLIC_ROOT_DOMAIN

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `output: 'standalone'` in next.config.ts emits a self-contained server
# with only the modules it actually imports.
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ────────────────────────────── runtime ──────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3030
ENV HOSTNAME=0.0.0.0

# `tini` reaps the zombies a Node process leaves behind and forwards
# signals, so the container stops promptly on `docker stop`.
RUN apk add --no-cache tini

# The standalone output already contains the pruned node_modules.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

USER node

EXPOSE 3030

# The health endpoint checks the database too, so an unhealthy container
# fails the probe rather than serving broken pages.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3030)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
