FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install --global pnpm@10.28.2
WORKDIR /workspace
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/admin/package.json ./apps/admin/package.json
COPY apps/mobile/package.json ./apps/mobile/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/validation/package.json ./packages/validation/package.json
COPY packages/api-client/package.json ./packages/api-client/package.json
COPY packages/design-tokens/package.json ./packages/design-tokens/package.json
RUN --mount=type=cache,id=utn-pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile
COPY . .
RUN DATABASE_URL=postgresql://build:build@localhost/build pnpm --filter @utn/api exec prisma generate
