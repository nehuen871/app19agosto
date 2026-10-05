FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install --global pnpm@10.28.2
WORKDIR /workspace
ENV NEXT_TELEMETRY_DISABLED=1
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/admin/package.json ./apps/admin/package.json
COPY apps/mobile/package.json ./apps/mobile/package.json
COPY packages ./packages
RUN --mount=type=cache,id=utn-pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile
FROM deps AS build
COPY . .
RUN DATABASE_URL=postgresql://build:build@localhost/build pnpm --filter @utn/api exec prisma generate
FROM build AS migrate
USER node
CMD ["pnpm", "--filter", "@utn/api", "db:deploy"]
FROM build AS api-build
RUN pnpm --filter @utn/api build
FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production PORT=4000
WORKDIR /app
COPY --from=api-build --chown=node:node /workspace/apps/api/dist ./dist
USER node
EXPOSE 4000
CMD ["node", "dist/server.mjs"]
