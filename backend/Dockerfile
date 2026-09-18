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
COPY drizzle ./drizzle
COPY seed_faculties.ts seed_gr_test.ts ./
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
RUN bun install  --production

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/schema.ts ./schema.ts
COPY --from=builder /usr/src/app/config.ts ./config.ts
COPY --from=builder /usr/src/app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /usr/src/app/drizzle ./drizzle
COPY --from=builder /usr/src/app/seed_faculties.ts ./seed_faculties.ts
COPY --from=builder /usr/src/app/seed_gr_test.ts ./seed_gr_test.ts
RUN apk add --no-cache wget

USER bun
EXPOSE 4000

CMD ["bun", "dist/src/main.js"]
