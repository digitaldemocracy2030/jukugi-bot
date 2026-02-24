# Transcription Agent

LiveKit エージェントとして動作するリアルタイム文字起こしサービス。Deepgram の STT（Speech-to-Text）を使用して、ディスカッション中の参加者の発話をテキストに変換する。

## アーキテクチャ

```
参加者 (マイク音声)
    ↓ LiveKit Room (WebRTC)
Transcription Agent (このサービス)
    ├─→ lk.transcription ストリーム → フロントエンドにリアルタイム配信
    └─→ POST /api/rooms/:roomId/transcripts → D1 に永続化
```

### 処理フロー

1. 管理者がルームをアクティベートすると、バックエンドが `AgentDispatchClient` でこのエージェントを LiveKit ルームにディスパッチする
2. エージェントが LiveKit ルームに接続し、参加者の音声を Deepgram でリアルタイム文字起こし
3. `AgentSession` が自動的に `lk.transcription` テキストストリームを発行し、フロントエンドに中間結果・確定結果を配信
4. 確定テキストはバックエンドの REST API 経由で D1 データベースに永続化

## セットアップ

### 前提条件

- [Deepgram](https://deepgram.com/) のアカウントと API キー

### 環境変数

| 変数 | 必須 | 説明 |
|------|------|------|
| `DEEPGRAM_API_KEY` | Yes | Deepgram API キー |
| `LIVEKIT_URL` | Yes | LiveKit サーバー URL（Docker 内: `http://livekit-server:7880`） |
| `LIVEKIT_API_KEY` | Yes | LiveKit API キー（Docker デフォルト: `devkey`） |
| `LIVEKIT_API_SECRET` | Yes | LiveKit API シークレット（Docker デフォルト: `secret`） |
| `ADMIN_API_KEY` | Yes | バックエンド管理者 API キー（文字起こし永続化に使用） |
| `BACKEND_URL` | No | バックエンド URL（デフォルト: `http://backend:8787`） |

### Docker で起動（推奨）

`.env` ファイルに `DEEPGRAM_API_KEY` を設定する:

```bash
# .env に追加
DEEPGRAM_API_KEY=your-deepgram-api-key
```

transcription プロファイルを指定して起動:

```bash
docker-compose --profile transcription up
```

`DEEPGRAM_API_KEY` が未設定の場合、`--profile transcription` を指定しなければエージェントは起動しない。他のサービスに影響はない。

### 手動起動（デバッグ用）

```bash
cd apps/transcription-agent
pnpm install
DEEPGRAM_API_KEY=xxx LIVEKIT_URL=http://localhost:7880 LIVEKIT_API_KEY=devkey LIVEKIT_API_SECRET=secret ADMIN_API_KEY=my-local-admin-key-12345 pnpm dev
```

## バックエンド連携

バックエンドの `TRANSCRIPTION_AGENT_NAME` 環境変数にエージェント名を設定する必要がある（Docker 環境ではデフォルトで `transcription-agent` が設定済み）。

ルームアクティベーション時の処理（`apps/backend/src/routes/session.ts`）:

```
POST /api/rooms/:roomId/activate
  → TRANSCRIPTION_AGENT_NAME が設定されている場合
  → AgentDispatchClient.createDispatch(roomName, agentName, { metadata: roomId })
  → エージェントが LiveKit ルームに参加
```

## フロントエンド連携

フロントエンドは LiveKit の `lk.transcription` テキストストリームを購読してリアルタイム文字起こしを表示する。

- **フック**: `app/hooks/use-transcription.ts` — `room.registerTextStreamHandler("lk.transcription", ...)` で文字起こしデータを管理
- **コンポーネント**: `app/components/room/transcription-panel.tsx` — ディスカッションフェーズにトグル表示されるパネル

エージェントの `AgentSession` が STT 結果を自動的にこのストリームに発行するため、フロントエンドとエージェント間の追加プロトコルは不要。

## 技術仕様

- **STT エンジン**: Deepgram Nova-3（`nova-3`）
- **言語**: 日本語（`ja`）
- **VAD**: Silero VAD（音声区間検出）
- **フレームワーク**: `@livekit/agents` v1.x
- **エージェント名**: `transcription-agent`（LiveKit ディスパッチ対象名）

## 制限事項

- 現在は日本語（`ja`）のみ対応。多言語対応は `src/agent.ts` の `language` 設定を変更することで可能
- Deepgram API への直接接続が必要（LiveKit Cloud の STT 機能とは独立）
- `DEEPGRAM_API_KEY` が未設定の場合、エージェントは起動しない（エラーにはならない）
