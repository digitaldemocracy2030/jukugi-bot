#!/bin/sh
set -e

echo "Starting backend..."

# Generate .dev.vars from environment variables
echo "Generating .dev.vars from environment..."
cat > /app/apps/backend/.dev.vars <<EOF
ENVIRONMENT=development
ADMIN_API_KEY=${ADMIN_API_KEY:-}
LIVEKIT_API_KEY=${LIVEKIT_API_KEY:-}
LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET:-}
LIVEKIT_WEBHOOK_SECRET=${LIVEKIT_WEBHOOK_SECRET:-}
STORAGE_ENDPOINT=${STORAGE_ENDPOINT:-}
STORAGE_ACCESS_KEY=${STORAGE_ACCESS_KEY:-}
STORAGE_SECRET_KEY=${STORAGE_SECRET_KEY:-}
STORAGE_PUBLIC_URL=${STORAGE_PUBLIC_URL:-}
LIVEKIT_URL=${LIVEKIT_URL:-}
TRANSCRIPTION_AGENT_NAME=${TRANSCRIPTION_AGENT_NAME:-}
OPENAI_API_KEY=${OPENAI_API_KEY:-}
AI_MODEL_LARGE=${AI_MODEL_LARGE:-}
AI_MODEL_MEDIUM=${AI_MODEL_MEDIUM:-}
AI_MODEL_SMALL=${AI_MODEL_SMALL:-}
EOF

sleep 1

echo "Running D1 migrations..."
cd /app/apps/backend

for f in ./migrations/*.sql; do
  if [ -f "$f" ]; then
    echo "  Running $f ..."
    pnpm wrangler d1 execute my-database --local --file="$f" || true
  fi
done

echo "Migrations completed!"
echo "Starting Wrangler dev server..."

exec pnpm dev
