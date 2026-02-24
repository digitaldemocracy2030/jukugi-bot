FROM node:24-slim AS development

# workerd に必要な依存
RUN apt-get update && apt-get install -y \
    libc++1 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# モノレポの workspace 構造を維持してインストール
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/backend/package.json ./apps/backend/

RUN pnpm install --frozen-lockfile --filter backend

COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend

# マイグレーション自動実行 + dev サーバー起動のエントリーポイント
COPY apps/backend/scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8787

CMD ["/docker-entrypoint.sh"]
