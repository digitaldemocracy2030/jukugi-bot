# Self-Hosted LiveKit Development Environment

## Prerequisites

- Docker and Docker Compose v2
- 4+ CPU cores and 4+ GB RAM recommended (Egress uses Chrome internally)

## Quick Start

1. Copy the example environment file:

```bash
cp .env.example .env
```

The defaults are pre-configured for the self-hosted setup. No changes needed.

2. Start all services:

```bash
docker compose up
```

3. Access the services:

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | React SPA |
| Backend API | http://localhost:8787 | Hono API |
| LiveKit Server | ws://localhost:7880 | WebRTC signaling |
| MinIO Console | http://localhost:9001 | Storage admin UI (minioadmin/minioadmin) |
| MinIO S3 API | http://localhost:9000 | S3-compatible storage |

## Services Overview

| Service | Image | Purpose |
|---------|-------|---------|
| `redis` | redis:7-alpine | Message broker for LiveKit + Egress |
| `livekit-server` | livekit/livekit-server | WebRTC SFU server |
| `egress` | livekit/egress | Recording service (room composite) |
| `minio` | minio/minio | S3-compatible local storage |
| `createbuckets` | minio/mc | One-shot: creates `recordings` bucket |

## Skipping Egress (Lightweight Mode)

Egress requires significant resources. To start without it:

```bash
docker compose up --scale egress=0
```

This disables recording but all other features (video, audio, data messages) work normally.

## Testing Recordings

1. Start all services (including Egress):

```bash
docker compose up
```

2. Create a room and start a recording via the API:

```bash
# Start recording (replace :roomId with actual room ID)
curl -X POST http://localhost:8787/api/rooms/:roomId/recording/start \
  -H "X-Admin-Key: my-local-admin-key-12345"
```

3. Verify the recording appears in MinIO:
   - Open http://localhost:9001 (login: minioadmin/minioadmin)
   - Navigate to the `recordings` bucket

### Downloading recordings locally

`recordings` バケットは public アクセスが有効なので、`curl` で直接ダウンロードできます。

```bash
# MinIO Console でファイルパスを確認し、ダウンロード
curl -o recording.mp4 http://localhost:9000/recordings/recordings/<roomId>/<timestamp>.mp4
```

ブラウザで `http://localhost:9000/recordings/recordings/<roomId>/<timestamp>.mp4` を開いて直接再生することもできます。

## Switching to LiveKit Cloud

To use LiveKit Cloud instead of the self-hosted setup:

1. Edit `.env` and uncomment the LiveKit Cloud section:

```bash
# Comment out self-hosted values
# LIVEKIT_URL=http://livekit-server:7880
# VITE_LIVEKIT_URL=ws://localhost:7880

# Uncomment and fill in cloud values
LIVEKIT_URL=wss://your-project.livekit.cloud
VITE_LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-cloud-api-key
LIVEKIT_API_SECRET=your-cloud-api-secret
```

2. Restart containers:

```bash
docker compose up
```

The self-hosted LiveKit, Redis, Egress, and MinIO services will still start but won't be used. You can skip them:

```bash
docker compose up frontend backend
```

## Troubleshooting

### LiveKit connection fails from browser

Ensure `VITE_LIVEKIT_URL` uses `ws://localhost:7880` (not the internal Docker hostname). The browser connects directly to the host-mapped port.

### Egress fails to start

Egress requires `SYS_ADMIN` capability for Chrome sandboxing. If you see permission errors, ensure your Docker setup supports `cap_add: SYS_ADMIN`.

### Recordings not appearing in MinIO

1. Check Egress logs: `docker compose logs egress`
2. Verify the `recordings` bucket exists: `docker compose logs createbuckets`
3. Ensure MinIO is healthy: `docker compose ps minio`

### Redis connection errors

Redis must be healthy before LiveKit starts. Check: `docker compose logs redis`

### Port conflicts

Default ports: 5173 (frontend), 8787 (backend), 7880-7881 (LiveKit), 9000-9001 (MinIO). Change them in `.env` or `docker-compose.yml` if conflicts occur.
