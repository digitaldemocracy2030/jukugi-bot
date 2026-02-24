# アーキテクチャ概要

## プロジェクト構成

Breakout Deliberation OS (OSODP) は、小規模な熟議型対話を支援するオープンソースプラットフォームです。モノリポ構成で、フロントエンド (React SPA) とバックエンド (Cloudflare Workers) から成ります。

```
osodp/
├── apps/
│   ├── backend/          # Hono + Cloudflare Workers API
│   └── frontend/         # React 19 + React Router 7 SPA
├── docs/                 # このドキュメント群
├── biome.json            # Linter / Formatter 設定
└── pnpm-workspace.yaml   # モノリポ設定
```

---

## バックエンド

### 技術スタック

| レイヤー | 技術 |
|---|---|
| ランタイム | Cloudflare Workers |
| フレームワーク | Hono |
| データベース | Cloudflare D1 (SQLite互換) |
| ORM | Drizzle ORM |
| バリデーション | Zod |
| リアルタイム通信 | LiveKit Cloud |
| API仕様 | OpenAPI (Swagger UI: `/api/docs`) |

### ディレクトリ構成

```
apps/backend/src/
├── index.ts              # エントリポイント・ルート登録・CORS設定
├── db/
│   └── schema.ts         # Drizzle ORM スキーマ定義
├── routes/
│   ├── rooms.ts          # ルーム CRUD
│   ├── phases.ts         # フェーズ CRUD
│   ├── session.ts        # 参加・アクティベート・フェーズ遷移
│   └── speaking.ts       # 発言キュー・割り込みロジック
├── schemas/              # Zod バリデーションスキーマ
├── livekit/
│   ├── types.ts          # TypeScript 型定義
│   ├── metadata.ts       # メタデータのシリアライズ/デシリアライズ
│   ├── token.ts          # 参加トークン生成
│   └── room-service.ts   # LiveKit API クライアント
└── middleware/
    └── admin-auth.ts     # APIキー認証ミドルウェア
```

### データベーススキーマ

#### rooms テーブル

| カラム | 型 | 説明 |
|---|---|---|
| `id` | text (PK) | 内部ID |
| `slug` | text (unique) | URL用スラッグ |
| `title` | text | ルームタイトル |
| `description` | text | 説明文 |
| `status` | enum | `draft` / `active` / `completed` / `archived` |
| `maxParticipants` | integer | 最大参加者数 (default: 10) |
| `createdAt` / `updatedAt` | timestamp | タイムスタンプ |

#### phases テーブル

| カラム | 型 | 説明 |
|---|---|---|
| `id` | text (PK) | 内部ID |
| `roomId` | text (FK) | ルームへの参照 |
| `type` | enum | `video` / `discussion` / `voting` / `survey` |
| `title` | text | フェーズ名 |
| `sortOrder` | integer | 実行順序 |
| `config` | JSON | フェーズ固有の設定 (動画IDなど) |
| `featureFlags` | JSON | 発言制御設定 (後述) |

**featureFlags の構造:**

```typescript
{
  canSpeak: boolean;              // 挙手・発言キューを有効化
  canInterrupt: boolean;          // 割り込みを許可
  canVote: boolean;               // 投票を有効化
  speakingTimeSec: number;        // 1発言の制限時間（秒）
  interruptionTimeSec: number;    // 割り込みの継続時間（秒）
  interruptionCooldownSec: number; // 割り込みのクールダウン（秒）
  maxInterruptions: number;       // フェーズ中の1人あたり割り込み上限
}
```

#### participants テーブル

| カラム | 型 | 説明 |
|---|---|---|
| `id` | text (PK) | 内部ID |
| `roomId` | text (FK) | ルームへの参照 |
| `displayName` | text | 表示名 |
| `role` | enum | `participant` / `facilitator` / `admin` |
| `joinedAt` / `leftAt` | timestamp | 入退室時刻 |

#### speakingLog テーブル

| カラム | 型 | 説明 |
|---|---|---|
| `id` | text (PK) | 内部ID |
| `roomId` | text (FK) | ルーム |
| `phaseId` | text (FK) | フェーズ |
| `participantId` | text (FK) | 発言者 |
| `type` | enum | `normal` / `interruption` |
| `startedAt` / `endedAt` | timestamp | 開始・終了時刻 |
| `durationSec` | integer | 発言時間（秒） |

---

## フロントエンド

### 技術スタック

| レイヤー | 技術 |
|---|---|
| フレームワーク | React 19 |
| ルーティング | React Router 7 (SPA モード) |
| ビルド | Vite |
| スタイリング | Tailwind CSS + shadcn/ui |
| 非同期状態管理 | TanStack Query |
| APIクライアント | Orval (OpenAPI自動生成) |
| リアルタイム | LiveKit Client SDK |

### ディレクトリ構成

```
apps/frontend/
├── app/
│   ├── root.tsx              # ルートレイアウト・エラーバウンダリ
│   ├── routes.ts             # ルート定義
│   ├── routes/
│   │   ├── home.tsx          # / ホームページ
│   │   └── room.tsx          # /room/:slug ルームページ（メイン）
│   ├── components/
│   │   ├── room/             # ルーム関連コンポーネント
│   │   │   ├── lobby.tsx             # 参加前ロビー画面
│   │   │   ├── live-room.tsx         # LiveKit接続ラッパー
│   │   │   ├── phase-renderer.tsx    # フェーズ切り替えレンダラー
│   │   │   ├── discussion-phase.tsx  # 議論フェーズUI
│   │   │   ├── video-phase.tsx       # 動画フェーズUI
│   │   │   ├── speaker-timer.tsx     # 発言タイマー表示
│   │   │   └── participant-sidebar.tsx # 参加者一覧サイドバー
│   │   └── ui/               # shadcn/ui コンポーネント
│   ├── hooks/
│   │   ├── use-room-metadata.ts     # LiveKitメタデータ購読
│   │   ├── use-youtube-player.ts    # YouTubeプレイヤー制御
│   │   └── ...
│   └── types/
│       └── room-metadata.ts         # メタデータ型定義
└── src/api/
    ├── gen/                  # Orval自動生成コード
    ├── models/               # 型定義
    └── custom-fetch.ts       # Fetchラッパー（adminKeyヘッダ注入等）
```

### 画面遷移

```
/room/:slug
    ↓ ルーム情報取得 (GET /api/rooms/:slug)
[lobby]
    ↓ 名前入力 → 参加ボタン (POST /api/rooms/:roomId/join)
[connecting]
    ↓ LiveKitトークン取得 → WebSocket接続
[connected]  ←→  フェーズに応じてUIが動的に切り替わる
    ↓ セッション終了 or 切断
[ended]
```

---

## リアルタイム同期の仕組み

### LiveKit Room Metadata

全参加者はLiveKitのルームメタデータを介してリアルタイムに状態を共有します。メタデータの変更は全員に即座にブロードキャストされます。

```typescript
// apps/backend/src/livekit/types.ts
type RoomMetadata = {
  roomId: string;
  currentPhaseId: string | null;
  currentPhaseType: "video" | "discussion" | "voting" | "survey" | null;
  featureFlags: {
    canSpeak: boolean;
    canInterrupt: boolean;
    canVote: boolean;
  };
  speakerQueue: {
    currentSpeaker: { participantId: string; speakingUntil: number } | null;
    queue: Array<{ participantId: string; displayName: string; requestedAt: number }>;
    interruptions: Array<{ participantId: string; displayName: string; expiresAt: number }>;
  };
  videoPhase?: {
    videoId: string;
    startAt: number;
    playing: boolean;
    playStartedAt: number | null;
    autoAdvance: boolean;
  };
};
```

### メタデータが更新されるタイミング

| 操作 | 更新内容 |
|---|---|
| ルームアクティベート | roomId、初期フェーズ設定 |
| フェーズ遷移 | currentPhaseId、currentPhaseType、featureFlags、キューリセット |
| 挙手・発言開始/終了 | speakerQueue 全体 |
| 割り込み申請・終了 | speakerQueue.interruptions |
| 動画再生/停止/シーク | videoPhase |

### 動画同期

ファシリテーターの操作がLiveKitデータチャンネル (`video-sync` トピック) で全参加者へブロードキャストされます。クライアント側は2秒以上のズレを検知すると自動的にシークします。

---

## 認証・認可

### Admin 認証

管理系APIはすべて `X-Admin-Key` ヘッダーによるAPIキー認証が必要です。

```
X-Admin-Key: <ADMIN_API_KEY>  # 環境変数で設定
```

保護対象: ルーム作成/更新/削除、フェーズ管理、アクティベート、フェーズ遷移、発言キュー操作（ファシリテーター機能）

### 参加者認証

参加者の認証は不要です（表示名のみで参加可能）。参加時に返される `participantId` によって識別します。ロール (`participant` / `facilitator` / `admin`) はDBで管理され、フロントエンドのUI表示を切り替えます。

---

## APIエンドポイント一覧

### ルーム管理 (Admin)

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/api/rooms` | ルーム作成 |
| GET | `/api/rooms/:slug` | ルーム取得 (公開) |
| PATCH | `/api/rooms/:roomId` | ルーム更新 |
| DELETE | `/api/rooms/:roomId` | ルーム削除 |
| POST | `/api/rooms/:roomId/activate` | ルームをアクティブ化 |

### フェーズ管理 (Admin)

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/api/rooms/:roomId/phases` | フェーズ追加 |
| GET | `/api/rooms/:roomId/phases` | フェーズ一覧取得 |
| PATCH | `/api/rooms/:roomId/phases/:phaseId` | フェーズ更新 |
| DELETE | `/api/rooms/:roomId/phases/:phaseId` | フェーズ削除 |
| PUT | `/api/rooms/:roomId/phases/reorder` | 順序変更 |

### セッション操作

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| POST | `/api/rooms/:roomId/join` | 公開 | 参加 (トークン取得) |
| POST | `/api/rooms/:roomId/phase/transition` | Admin | フェーズ遷移 |

### 発言キュー操作

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| POST | `/api/rooms/:roomId/queue/join` | 公開 | 挙手（キュー参加） |
| DELETE | `/api/rooms/:roomId/queue/leave` | 公開 | 挙手取り消し |
| POST | `/api/rooms/:roomId/queue/next` | Admin | 次の発言者へ進む |
| POST | `/api/rooms/:roomId/queue/skip` | Admin | 現在の発言者をスキップ |
| POST | `/api/rooms/:roomId/interrupt` | 公開 | 割り込み申請 |
| POST | `/api/rooms/:roomId/interrupt/:participantId/end` | Admin | 割り込み強制終了 |
| POST | `/api/rooms/:roomId/speaking/check` | 公開 | 発言時間の自動チェック（ポーリング） |
