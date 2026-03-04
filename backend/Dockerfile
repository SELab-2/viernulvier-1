FROM --platform=$BUILDPLATFORM node:24 AS base

RUN npm install -g pnpm

WORKDIR /app


# ---------------------------
# Dependency Fetch Layer
# ---------------------------

FROM base AS deps

COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./

COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

RUN pnpm fetch


# ---------------------------
# Build Layer
# ---------------------------

FROM base AS build

WORKDIR /app

COPY --from=deps /app /app

COPY . .

RUN pnpm install

# RUN pnpm --filter shared build 
RUN pnpm --filter backend build


# ---------------------------
# Runtime Layer (Tiny Image)
# ---------------------------

FROM node:24-slim

WORKDIR /app

COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/node_modules ./node_modules

EXPOSE 80
CMD ["node", "dist/backend/src/index.js"]