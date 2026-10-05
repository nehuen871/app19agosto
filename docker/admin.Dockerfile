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
RUN pnpm --filter @utn/admin build
FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=build --chown=node:node /workspace/apps/admin/.next/standalone ./
COPY --from=build --chown=node:node /workspace/apps/admin/.next/static ./apps/admin/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/admin/server.js"]
