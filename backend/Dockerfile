FROM --platform=$BUILDPLATFORM node:24 AS base

RUN npm install -g pnpm@10.30.3

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
COPY --from=build /app/backend/migrations ./migrations

COPY backend/docker-entrypoint.sh /docker-entrypoint.sh

# This is needed so swagger ui can serve its static files.
RUN mkdir -p ./static
RUN cp -r ./node_modules/@fastify/swagger-ui/static/* ./static/

RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/backend/src/index.js"]