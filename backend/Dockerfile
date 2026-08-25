# Base image
FROM node:20-alpine AS base

FROM base AS builder
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install 

COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /usr/src/app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x docker-entrypoint.sh

USER node

EXPOSE 4000


ENTRYPOINT [ "node", "dist/src/main.js" ]
