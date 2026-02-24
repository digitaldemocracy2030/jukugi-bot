# セッションの進行フロー

このドキュメントでは、管理者がルームを作成してからセッションが終了するまでの全フローを、具体的なAPI操作と状態変化を交えて説明します。

---

## 全体像

```
[準備フェーズ]
  1. ルーム作成 (Admin)
  2. フェーズ追加・設定 (Admin)
  3. ルームアクティベート (Admin)

[本番フェーズ]
  4. 参加者が入室
  5. フェーズ進行
     ├─ 動画フェーズ (ファシリテーターが同期制御)
     └─ 議論フェーズ (発言キュー・割り込みで進行)
  6. フェーズ遷移（繰り返し）

[終了フェーズ]
  7. ルーム完了
  8. 記録の参照
```

---

## 1. ルーム作成

管理者がAPIを叩いてルームを作成します。

```http
POST /api/rooms
X-Admin-Key: <ADMIN_API_KEY>
Content-Type: application/json

{
  "slug": "civic-deliberation-01",
  "title": "市民討議会 第1回",
  "description": "地域の課題について話し合います",
  "maxParticipants": 20
}
```

**レスポンス:**

```json
{
  "id": "room_abc123",
  "slug": "civic-deliberation-01",
  "status": "draft",
  ...
}
```

ルームは `draft` 状態で作成されます。この時点では参加者は入室できません。

---

## 2. フェーズの設計・追加

セッションのアジェンダ（フェーズ）を順番に追加します。典型的な構成:

```
フェーズ1: 動画視聴（問題提起動画）
フェーズ2: 議論（発言キューあり・割り込み許可）
フェーズ3: 投票（意見集約）
```

### フェーズ追加の例

**フェーズ1: 動画視聴**

```http
POST /api/rooms/room_abc123/phases
X-Admin-Key: <ADMIN_API_KEY>
Content-Type: application/json

{
  "type": "video",
  "title": "問題提起動画の視聴",
  "sortOrder": 1,
  "config": {
    "videoId": "dQw4w9WgXcQ"
  },
  "featureFlags": {
    "canSpeak": false,
    "canInterrupt": false,
    "canVote": false
  }
}
```

**フェーズ2: 議論**

```http
POST /api/rooms/room_abc123/phases
X-Admin-Key: <ADMIN_API_KEY>
Content-Type: application/json

{
  "type": "discussion",
  "title": "グループ討議",
  "sortOrder": 2,
  "config": {},
  "featureFlags": {
    "canSpeak": true,
    "canInterrupt": true,
    "canVote": false,
    "speakingTimeSec": 120,
    "interruptionTimeSec": 30,
    "interruptionCooldownSec": 60,
    "maxInterruptions": 3
  }
}
```

### フェーズの順序変更

```http
PUT /api/rooms/room_abc123/phases/reorder
X-Admin-Key: <ADMIN_API_KEY>
Content-Type: application/json

{
  "phaseIds": ["phase_video_1", "phase_discussion_1", "phase_vote_1"]
}
```

---

## 3. ルームアクティベート

フェーズの設定が完了したら、ルームをアクティブ化します。

```http
POST /api/rooms/room_abc123/activate
X-Admin-Key: <ADMIN_API_KEY>
```

**このAPIが行うこと:**

1. LiveKit側にルームを作成 (名前: `room-room_abc123`)
2. ルームのステータスを `draft` → `active` に更新
3. LiveKit Room Metadata を初期化

アクティベート後、参加者がURLにアクセスして入室できるようになります。

**ルームURL:** `https://<your-domain>/room/civic-deliberation-01`

---

## 4. 参加者の入室

参加者がURLを開くとロビー画面が表示されます。

### フロントエンド側の流れ

```
1. GET /api/rooms/civic-deliberation-01
   → ルーム情報取得（タイトル・説明・ステータス確認）

2. [ロビー画面] 表示名を入力して「参加する」ボタン

3. POST /api/rooms/room_abc123/join
   Body: { "displayName": "田中太郎" }

   Response: {
     "token": "eyJ...",          // LiveKit接続トークン
     "livekitUrl": "wss://...",  // LiveKit WebSocket URL
     "participantId": "p_xyz789" // DB上の参加者ID
   }

4. LiveKitRoom へ WebSocket 接続確立

5. useRoomMetadata() フックがメタデータを監視開始
   → PhaseRenderer がフェーズタイプに応じたUIを表示
```

### ルームステータスが draft の場合

参加APIは失敗し、ロビー画面に「ルームはまだ準備中です」と表示されます。

---

## 5. フェーズの進行

### フェーズ遷移

ファシリテーター/管理者がフェーズを切り替えます。

```http
POST /api/rooms/room_abc123/phase/transition
X-Admin-Key: <ADMIN_API_KEY>
Content-Type: application/json

{
  "phaseId": "phase_discussion_1"
}
```

**サーバー側で行われること:**

1. 指定フェーズの `featureFlags` を取得
2. LiveKit Room Metadata を更新:
   - `currentPhaseId` ← 新フェーズID
   - `currentPhaseType` ← "discussion"
   - `featureFlags` ← フェーズの設定
   - `speakerQueue` ← `{ currentSpeaker: null, queue: [], interruptions: [] }` にリセット
3. 全参加者が `RoomMetadataChanged` イベントを受信 → UIが即座に切り替わる

---

### 動画フェーズ (type: video)

ファシリテーターが動画の再生を制御し、全参加者の画面が同期されます。

#### フロントエンドの動作

- YouTube IFrame が埋め込まれる
- `videoPhase.playing` が true なら再生、false なら一時停止
- 2秒以上のズレを検知したら自動シーク

#### ファシリテーターの操作

ファシリテーターのUIには専用コントロールが表示されます。操作はLiveKit データチャンネル (`video-sync` トピック) で全員にブロードキャストされ、メタデータの `videoPhase` も更新されます。

| 操作 | 効果 |
|---|---|
| 再生 | 全員の動画が再生開始 |
| 一時停止 | 全員の動画が一時停止 |
| シーク | 全員が指定位置に移動 |
| 次のフェーズへ | フェーズ遷移API呼び出し |

`autoAdvance: true` の場合、動画終了時に自動的に次のフェーズへ遷移します。

---

### 議論フェーズ (type: discussion)

発言キューと割り込みによって、公平な発言機会を管理します。

#### 発言キューの状態

```
currentSpeaker: null | { participantId, speakingUntil }
queue: [{ participantId, displayName, requestedAt }, ...]
interruptions: [{ participantId, displayName, expiresAt }, ...]
```

この状態はLiveKit Room Metadata で管理され、全員がリアルタイムに参照できます。

#### 参加者の操作フロー

**挙手（発言キューへの参加）:**

```
1. 参加者が「挙手」ボタンをクリック
   → POST /api/rooms/room_abc123/queue/join
      Body: { "participantId": "p_xyz789" }

2. speakerQueue.queue の末尾に追加
3. 全員のUIでキューが更新される
```

**挙手の取り消し:**

```
DELETE /api/rooms/room_abc123/queue/leave
Body: { "participantId": "p_xyz789" }
```

**割り込み申請:**

```
1. 参加者が「割り込み」ボタンをクリック（確認ダイアログあり）
   → POST /api/rooms/room_abc123/interrupt
      Body: { "participantId": "p_xyz789" }

2. 以下のチェックが行われる:
   - canInterrupt が true か
   - 同時割り込み上限 (2名) に達していないか
   - maxInterruptions を超えていないか
   - クールダウン中でないか

3. speakerQueue.interruptions に追加
4. interruptionTimeSec 後に自動終了
```

#### ファシリテーターの操作フロー

**次の発言者へ進む:**

```
POST /api/rooms/room_abc123/queue/next
X-Admin-Key: <ADMIN_API_KEY>
Body: { "phaseId": "phase_discussion_1" }

処理内容:
1. 現在の発言者をミュート (LiveKit publish権限を剥奪)
2. 発言ログに終了時刻・duration を記録
3. queue[0] を currentSpeaker に昇格
4. その参加者のマイクをアンミュート
5. speakingUntil = now + speakingTimeSec * 1000 をセット
6. 発言ログに開始時刻を記録
7. メタデータを更新 → 全員のUIが切り替わる
```

**スキップ（発言ログを残さずスキップ）:**

```
POST /api/rooms/room_abc123/queue/skip
X-Admin-Key: <ADMIN_API_KEY>
Body: { "phaseId": "phase_discussion_1" }

処理内容: next と同じだが speakingLog に記録しない
```

**割り込みを強制終了:**

```
POST /api/rooms/room_abc123/interrupt/p_xyz789/end
X-Admin-Key: <ADMIN_API_KEY>
Body: { "phaseId": "phase_discussion_1" }

処理内容:
1. 対象者をミュート
2. interruptions から削除
3. メタデータ更新
```

#### 発言時間の自動管理

フロントエンドは約5秒ごとに `speaking/check` をポーリングします。

```
POST /api/rooms/room_abc123/speaking/check
Body: { "phaseId": "phase_discussion_1" }

処理内容:
- currentSpeaker.speakingUntil が過去なら → 自動的に next と同じ処理
- interruptions[].expiresAt が過去なら → ミュート・削除
```

これによりタイマー切れの参加者が自動的にミュートされます。

---

## 議論フェーズの典型的なタイムライン

```
00:00  フェーズ遷移 → 議論フェーズ開始
       全員のUIに発言キュー・挙手ボタンが表示

00:10  参加者A が挙手
       → queue: [A]

00:15  参加者B・C が挙手
       → queue: [A, B, C]

00:20  ファシリテーターが「次の発言者」をクリック
       → A がマイクON、speakingUntil = 02:20 (120秒)
       → queue: [B, C]

00:45  参加者D が割り込み申請
       → interruptions: [D] (30秒間有効)

01:15  Dの割り込み時間切れ → 自動ミュート・削除

02:20  Aの発言時間切れ → 自動的に次の発言者へ
       → B がマイクON、speakingUntil = 04:20
       → queue: [C]

03:00  ファシリテーターが「スキップ」をクリック
       → C がマイクON（Bの発言ログなし）

...    繰り返し

XX:XX  ファシリテーターがフェーズ遷移 → 次のフェーズへ
```

---

## 6. 発言ログの記録

すべての発言はD1データベースの `speakingLog` テーブルに記録されます。

```sql
SELECT
  p.display_name,
  sl.type,
  sl.started_at,
  sl.ended_at,
  sl.duration_sec
FROM speaking_log sl
JOIN participants p ON sl.participant_id = p.id
WHERE sl.room_id = 'room_abc123'
ORDER BY sl.started_at;
```

これによりセッション後の分析が可能です:
- 誰が何分発言したか
- 割り込みの頻度・発言者の偏り
- フェーズごとの発言分布

---

## 7. ルーム完了

セッション終了後、ルームを完了状態に更新します。

```http
PATCH /api/rooms/room_abc123
X-Admin-Key: <ADMIN_API_KEY>
Content-Type: application/json

{
  "status": "completed"
}
```

完了後は新規参加できなくなります（接続中の参加者には `ended` 画面が表示されます）。

---

## ステータス遷移図

### ルームのステータス

```
draft
  │
  │ POST /rooms/:id/activate
  ↓
active
  │
  │ PATCH /rooms/:id { status: "completed" }
  ↓
completed
  │
  │ PATCH /rooms/:id { status: "archived" }
  ↓
archived
```

### フロントエンドの接続状態

```
[lobby]
  参加者がURLを開いた時の初期状態
  → 表示名の入力フォームが表示される

  ↓ join API 成功 + LiveKit接続開始

[connecting]
  → LiveKit WebSocketへの接続中

  ↓ 接続確立

[connected]
  → セッション本体のUI
  → フェーズに応じてUIが動的に切り替わる
  → メタデータの変化をリアルタイムに反映

  ↓ disconnected / roomStatus = completed

[ended]
  → セッション終了画面
```

### 発言キューの状態遷移

```
[キュー待機]
  queue: [A, B, C]
  currentSpeaker: null

  ↓ queue/next

[発言中]
  currentSpeaker: { participantId: A, speakingUntil: T }
  queue: [B, C]

  ├─ speakingUntil 到達 → 自動 next
  ├─ ファシリテーター next → 次の発言者へ
  └─ ファシリテーター skip → ログなしで次へ
```

---

## 設計上の注意点

### 発言キューはLiveKit Metadataで管理

発言キューのリアルタイム状態 (`speakerQueue`) はD1ではなくLiveKitのRoom Metadataに格納されています。これにより:
- Cloudflare Workers の無状態性を活かした設計
- 全参加者へのブロードキャストが自動的に行われる
- ただし、LiveKitルームが削除されると状態は失われる

### 自動タイマーはポーリングで実現

Cloudflare Workers にはバックグラウンドタスクがないため、時間切れの検知は `/speaking/check` ポーリングで実現しています。フロントエンドが約5秒ごとに呼び出し、サーバー側で期限切れを処理します。

### 割り込みの公平性制御

割り込みには複数の制約があります:
- 同時上限: 最大2名まで同時に割り込み可能
- 1人あたりの回数上限: `maxInterruptions` (フェーズごとに設定)
- クールダウン: 前回の割り込みから `interruptionCooldownSec` 秒が経過するまで不可

これにより特定参加者が発言を独占することを防ぎます。

### 発言ログの用途

`speakingLog` テーブルはリアルタイム状態の管理には使われず、純粋にセッション後の監査・分析用です。発言時間の偏りや割り込みパターンを可視化することで、民主的な対話の質の評価に使えます。
