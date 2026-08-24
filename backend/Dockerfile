# Base image
FROM node:20-alpine AS base

FROM base AS builder
WORKDIR /usr/src/app

COPY package*.json ./
RUN NODE_OPTIONS="--max-old-space-size=512" npm install --no-audit --no-fund

COPY . .
RUN npm run build
RUN npm prune --production

FROM base AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist

USER node

EXPOSE 4000

CMD ["node", "dist/src/main.js"]
