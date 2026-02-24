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
EOF

# Set LIVEKIT_URL in wrangler.toml from environment
if [ -n "${LIVEKIT_URL:-}" ]; then
  sed -i "s|^LIVEKIT_URL = .*|LIVEKIT_URL = \"${LIVEKIT_URL}\"|" /app/apps/backend/wrangler.toml
fi

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
