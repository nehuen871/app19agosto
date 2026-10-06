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
FROM build AS mobile-build
ENV EXPO_PUBLIC_API_URL=/api/v1
RUN pnpm --filter @utn/mobile export:web
RUN node scripts/build-mobile-server.mjs
FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production PORT=8081
WORKDIR /app
COPY --from=mobile-build --chown=node:node /workspace/apps/mobile/dist ./public
COPY --from=mobile-build --chown=node:node /workspace/mobile-server.mjs ./server.mjs
USER node
EXPOSE 8081
CMD ["node", "server.mjs"]
