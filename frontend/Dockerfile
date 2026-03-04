FROM --platform=$BUILDPLATFORM node:24 AS base

RUN npm install -g pnpm
WORKDIR /app


FROM base AS deps

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/


RUN pnpm fetch

FROM base AS build

COPY --from=deps /app /app

COPY . .

RUN pnpm install
# RUN pnpm --filter shared build
RUN pnpm --filter frontend build


FROM nginx:stable-alpine

COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE $FRONTEND_PORT
CMD ["nginx", "-g", "daemon off;"]