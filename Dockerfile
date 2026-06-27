# syntax=docker/dockerfile:1
# Multi-stage build: the build stage has ALL deps (vite/typescript/@react-router/dev
# are needed to build); the runtime image ships only production deps + artifacts.

# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

# ---------- runtime ----------
FROM node:22-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV PORT=3000

# Production dependencies only.
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# App build output, static assets, and the Prisma schema/migrations.
COPY --from=build /app/build ./build
COPY --from=build /app/public ./public
COPY prisma ./prisma

# Run as the unprivileged built-in `node` user (needs to own files it writes,
# e.g. the Prisma client generated at start).
RUN chown -R node:node /app
USER node

EXPOSE 3000
# docker-start = prisma generate && prisma migrate deploy && start.
# NOTE: running `migrate deploy` on every container boot is fine for a single
# instance. For horizontal scaling, run migrations as a one-off release step and
# change this to just start the server (see DEPLOYMENT.md).
CMD ["npm", "run", "docker-start"]
