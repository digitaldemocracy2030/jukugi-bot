FROM node:24-slim AS development

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY . .

ENV CI=true
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

WORKDIR /app/apps/frontend

EXPOSE 5173

CMD ["pnpm", "dev", "--host"]
