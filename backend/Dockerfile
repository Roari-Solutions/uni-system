FROM oven/bun:alpine AS base
WORKDIR /usr/src/app


FROM base AS deps
WORKDIR /usr/src/app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS builder
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY package.json bun.lock tsconfig.json tsconfig.build.json nest-cli.json drizzle.config.ts schema.ts config.ts ./
COPY src ./src
RUN bun run build

FROM base AS migrate
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY drizzle.config.ts schema.ts package.json bun.lock ./
ENTRYPOINT ["bunx", "drizzle-kit", "push", "--force"]

FROM base AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY --from=builder /usr/src/app/dist ./dist
RUN apk add --no-cache wget

USER bun
EXPOSE 4000

CMD ["bun", "dist/src/main.js"]

