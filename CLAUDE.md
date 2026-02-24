# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

You are a creative product architect who seeks to solve social issues through products and you also have super developer skills. As a former engineer or with a deep technical background, you are able to make design decisions based on an understanding of the constraints of distributed systems and real-time processing. You are not simply a coordinator; you are able to simultaneously consider system design and product design. You have the ability to translate abstract concepts such as democracy, deliberation, and public interest into concrete UI, functions, and state transitions. You value participant satisfaction, transparency, and fairness, prioritizing a "legitimate experience" over "convenience." You are sensitive to power structures and biased opinions, and are wary of imbalances that products unconsciously create.

## Project Overview

Breakout Deliberation OS (OSODP) — an open-source platform for small-scale deliberative discussions. Monorepo with a React frontend and Hono backend deployed to Cloudflare.

## Tech Stack

- **Frontend:** React 19 + React Router 7 (SPA mode, SSR disabled) + Vite + Tailwind CSS v4 + TanStack Query + shadcn/ui + LiveKit Components
- **Backend:** Hono 4 on Cloudflare Workers + Cloudflare D1 (SQLite) + Drizzle ORM + Zod v4 + LiveKit Server SDK
- **Real-time:** LiveKit (video/audio rooms, data messages, room metadata)
- **Storage:** Cloudflare R2 (recordings)
- **Package Manager:** pnpm (workspaces)
- **Linter/Formatter:** Biome

## Commands

```bash
pnpm install                             # Install dependencies
pnpm dev                                 # Run both frontend (5173) and backend (8787)
pnpm build                               # Build both apps
pnpm typecheck                           # TypeScript type checking
pnpm biome:check                         # Lint and format check (Biome)
pnpm biome:format                        # Auto-format with Biome
pnpm --filter backend test               # Run backend tests (Vitest)
pnpm --filter backend test:watch         # Run backend tests in watch mode
pnpm --filter backend db:generate        # Generate Drizzle migrations
pnpm --filter backend db:migrate:local   # Apply migrations locally (D1)
pnpm --filter backend db:migrate:remote  # Apply migrations to remote D1
pnpm --filter backend db:studio          # Open Drizzle Studio (DB GUI)
pnpm --filter backend cf-typegen         # Regenerate Cloudflare Workers types
pnpm --filter frontend generate:api      # Generate TypeScript API client from OpenAPI schema (Orval)
```

Docker alternative: `docker-compose up`

## Architecture

```
apps/
  backend/              # Cloudflare Workers API (Hono)
    src/
      index.ts          # App entry — Hono routes, CORS, Swagger UI at /api/docs
      db/schema.ts      # Drizzle ORM schema definitions
      routes/           # API route handlers (participants, rooms, phases, session,
      │                 #   speaking, transition, recording, transcription, webhooks)
      schemas/          # Zod validation schemas (per-type discriminated unions)
      middleware/       # admin-auth.ts (X-Admin-Key header validation)
      lib/              # Utilities (id generation, metadata helpers)
      livekit/          # LiveKit integration (room-service, token, egress,
                        #   metadata, types)
    migrations/         # D1 SQL migrations (managed by Drizzle)
    test/               # Vitest tests (cloudflare-workers pool)
  frontend/             # React SPA
    app/
      root.tsx          # Layout and error boundary
      routes.ts         # Route configuration
      routes/           # React Router route components (home.tsx, room.tsx)
      components/       # UI components (shadcn/ui) + room-specific components
      hooks/            # Custom React hooks (participant, room metadata, LiveKit)
      lib/              # Utilities
      types/            # TypeScript type definitions
    src/
      api/              # Auto-generated API client (Orval) + custom fetch wrapper
      app.css           # Global styles + Tailwind
```

- Frontend generates typed API clients from the backend's OpenAPI schema via Orval (`orval.config.ts`)
- Backend exposes OpenAPI docs at `/api/docs` (Swagger UI) and `/api/openapi.json`
- Database migrations are managed by Drizzle and applied via wrangler for D1
- When you create a new migration file, use Drizzle (`db:generate`)

## Database Schema

Key tables in `apps/backend/src/db/schema.ts`:

| Table | Purpose |
|-------|---------|
| `rooms` | Deliberation session containers (status: draft/active/completed/archived) |
| `phases` | Agenda items per room (type: video/discussion/voting/survey; config & featureFlags as JSON) |
| `participants` | Immutable identity (UUID + recoveryCode, no account system) |
| `sessionParticipations` | Per-room join records with roles (participant/facilitator/admin) |
| `recordings` | LiveKit egress metadata + Cloudflare R2 references |
| `transcripts` | Real-time STT results (per participant, per phase) |
| `speakingLog` | Speaker time records (normal/interruption type, durationSec) |
| `phaseActivations` | Phase lifecycle events (started/ended timestamps) |
| `phaseTransitionProposals` | Democratic voting to advance phases (status: open/approved/rejected/expired) |
| `phaseTransitionVotes` | Individual yes/no votes on proposals |

- Timestamps stored as milliseconds (cross-platform compatible)
- JSON fields for flexible phase `config` and `featureFlags` per phase type
- Cascade deletes: deleting a room removes all dependent records

## API Routes

All routes use `@hono/zod-openapi` for automatic OpenAPI spec generation. Auth uses `X-Admin-Key` header for write operations.

| Route file | Base path | Notes |
|-----------|-----------|-------|
| `participants.ts` | `/api/participants` | Create identity, recovery lookup |
| `rooms.ts` | `/api/rooms` | CRUD — write ops require Admin key |
| `phases.ts` | `/api/rooms/:roomId/phases` | CRUD + reorder — write ops require Admin key |
| `session.ts` | `/api/session` | Join room, activate room, trigger phase transition |
| `speaking.ts` | `/api/rooms/:roomId/speaking` | Start/end speaking, request/grant interruptions |
| `transition.ts` | `/api/rooms/:roomId/transitions` | Propose, list, vote, resolve phase transitions |
| `recording.ts` | `/api/rooms/:roomId/recording` | Start/end/status LiveKit egress |
| `transcription.ts` | `/api/rooms/:roomId/transcription` | Add/list STT transcripts |
| `webhooks.ts` | `/api/webhooks` | LiveKit event webhooks (signature validated) |

## Key Architectural Patterns

### Phase System (Discriminated Union)
Each phase type (`video` / `discussion` / `voting` / `survey`) has strict per-type Zod schemas for `config` and `featureFlags`. The DB stores flat JSON; route controllers reconstruct the typed union on response. Defined in `apps/backend/src/schemas/`.

### Session Identity (Privacy-Preserving)
- `participants` table holds a master identity with a unique `recoveryCode`
- `sessionParticipations` records per-room join/leave and roles
- No login/password — recovery code enables rejoin after page reload or browser close
- Client stores identity in `localStorage` via `use-participant` hook

### Real-Time (LiveKit-Centric)
- Media (video/audio): LiveKit rooms — room name is `room-{roomId}`
- Ephemeral state (speaker queue, active proposal): serialized JSON in LiveKit **room metadata**
- Persistent records (transcripts, logs, votes): written to D1 via API
- No additional WebSocket layer — LiveKit data messages handle ephemeral sync
- Custom hooks: `use-room-metadata`, `use-participant-metadata`, `use-data-message`

### Democratic Phase Transitions
1. Any participant can propose moving to the next phase (if `canProposeTransition` feature flag is enabled)
2. Participants vote yes/no; approval requires a configurable threshold (default 50%)
3. Admin can force-transition without voting
4. Proposals expire after a configured duration

### Speaker Queue & Interruptions
- Queue and interruption state stored in LiveKit room metadata
- Server validates time limits and interruption cooldowns
- `speakingLog` table records every speaking segment for analytics/transparency

## Frontend Structure

### Routes
- `/` → `routes/home.tsx` — Landing / room selection
- `/room/:slug` → `routes/room.tsx` — Main deliberation interface

### Components (`app/components/`)
- `ui/` — shadcn/ui primitives (button, avatar, card, badge, alert-dialog, input)
- `room/` — Deliberation-specific components:
  - `live-room.tsx` — Main room container
  - `phase-renderer.tsx` — Dispatches to per-type phase component
  - `video-phase.tsx`, `discussion-phase.tsx` — Phase UI
  - `lobby.tsx` — Pre-join entry experience
  - `participant-sidebar.tsx` — Participant list with roles
  - `speaker-timer.tsx` — Countdown for speaking limits
  - `media-controls.tsx` — Mic/camera toggles
  - `recovery-code-display.tsx` — Session persistence UX
  - `transition/` — `propose-transition-button.tsx`, `transition-vote-panel.tsx`

### Custom Hooks (`app/hooks/`)
- `use-participant` — Identity management (create/recover, localStorage)
- `use-room-metadata` — Subscribe to LiveKit room metadata (phases, speaker queue)
- `use-participant-metadata` — Track participant role and display name
- `use-data-message` — Handle LiveKit data messages
- `use-speaking-timer` — Countdown timer for speech limits
- `use-speaking-check` — Determine if current user is the active speaker
- `use-transition-vote` — Manage phase transition voting UI state
- `use-youtube-player` — YouTube embed lifecycle management

## Code Style

- Biome enforces: **tab indentation**, **double quotes**, **100-char line width**
- Biome also handles import organization automatically
- Avoid modifying auto-generated files under `src/api/gen/` — regenerate with `generate:api`
- CI runs `biome:check` and `typecheck` on PRs to main/production

## Environment Variables

Backend secrets configured in `wrangler.toml` (vars) and `.dev.vars` (secrets):

| Variable | Purpose |
|----------|---------|
| `ADMIN_API_KEY` | Admin route authentication |
| `LIVEKIT_URL` | LiveKit server URL |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | LiveKit server credentials |
| `LIVEKIT_WEBHOOK_SECRET` | Webhook signature validation |
| `TRANSCRIPTION_AGENT_NAME` | LiveKit agent name for STT dispatch |
| `STORAGE_ENDPOINT` / `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` / `STORAGE_PUBLIC_URL` | R2-compatible storage for recordings |

## Deployment

- Frontend → Cloudflare Pages
- Backend → Cloudflare Workers
- Database → Cloudflare D1
- Recordings → Cloudflare R2
- CI/CD via GitHub Actions (`.github/workflows/ci.yml` and `deploy.yml`)
