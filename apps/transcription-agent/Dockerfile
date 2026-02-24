FROM node:22-slim AS base

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy all workspace package.json files for dependency resolution
COPY apps/transcription-agent/package.json apps/transcription-agent/package.json

# Install dependencies
RUN pnpm install --frozen-lockfile --filter transcription-agent

# Copy source
COPY apps/transcription-agent apps/transcription-agent

WORKDIR /app/apps/transcription-agent

CMD ["pnpm", "dev"]
