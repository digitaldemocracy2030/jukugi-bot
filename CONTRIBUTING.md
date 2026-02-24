# Contributing to Breakout Deliberation OS

まず、このプロジェクトへの貢献に興味を持っていただきありがとうございます。
Breakout Deliberation OS は、公共熟議のインフラを共に構築するためのオープンソースプロジェクトです。
バグ修正、機能提案、ドキュメント改善、翻訳など、あらゆる形の貢献を歓迎します。

---

## 目次

- [行動規範](#行動規範)
- [貢献の種類](#貢献の種類)
- [Issue の報告](#issue-の報告)
- [Pull Request の送り方](#pull-request-の送り方)
- [開発環境のセットアップ](#開発環境のセットアップ)
- [コードスタイル](#コードスタイル)
- [テスト](#テスト)
- [コミットメッセージ](#コミットメッセージ)
- [ブランチ戦略](#ブランチ戦略)

---

## 行動規範

このプロジェクトに参加するすべての人は、互いを尊重し、建設的な対話を心がけてください。
差別的・攻撃的な言動、ハラスメント行為は受け入れられません。
本プロジェクトは熟議と公共性を価値の中心に置いており、コントリビューター同士の議論もその精神に沿って行われることを期待しています。

---

## 貢献の種類

以下のような形で貢献いただけます。

| 種類 | 説明 |
|------|------|
| バグ報告 | 再現手順付きの Issue を作成する |
| 機能提案 | ユースケースを明記した Issue を作成する |
| バグ修正 | Issue を参照した Pull Request を送る |
| 新機能実装 | 事前に Issue で議論してから実装する |
| ドキュメント改善 | README・CLAUDE.md・コメントの誤りや不足を修正する |
| テスト追加 | カバレッジが不十分な箇所にテストを追加する |
| 翻訳 | UI テキストやドキュメントを他言語に翻訳する |

---

## Issue の報告

Issue を作成する前に、以下を確認してください。

1. **既存の Issue を検索する** — 同じ問題や提案がすでに存在しないか確認してください
2. **最新の `main` ブランチで再現するか確認する** — すでに修正されている可能性があります
3. **Issue テンプレートを使用する** — `.github/ISSUE_TEMPLATE/issue.yml` に従って記入してください

> セキュリティ上の脆弱性は、公開 Issue ではなく、メンテナーに直接連絡してください。

---

## Pull Request の送り方

### 基本的な流れ

1. **リポジトリを Fork する**
2. **ブランチを作成する** (後述の[ブランチ戦略](#ブランチ戦略)を参照)
3. **変更を加える**
4. **テスト・Lint を通す**
5. **コミットする** (後述の[コミットメッセージ](#コミットメッセージ)を参照)
6. **Fork 先にプッシュする**
7. **Pull Request を作成する**

### Pull Request チェックリスト

PR を送る前に、以下をすべて確認してください。

- [ ] 関連する Issue を `Closes #xxx` で紐づけている
- [ ] `pnpm typecheck` がエラーなしで通る
- [ ] `pnpm biome:check` がエラーなしで通る
- [ ] `pnpm --filter backend test` がすべてパスする
- [ ] 新しいバックエンドエンドポイントにはテストを追加している
- [ ] バックエンドのスキーマ変更後に `pnpm --filter frontend generate:api` を実行している
- [ ] DB スキーマを変更した場合、マイグレーションを `pnpm --filter backend db:generate` で生成している
- [ ] 機密情報 (APIキー、パスワード等) をコードやコミットに含めていない

### Pull Request の説明

以下の内容を含めてください。

- **何を変更したか** — 変更の概要
- **なぜ変更したか** — 動機・背景
- **どうテストしたか** — 動作確認の手順
- **スクリーンショット** — UI 変更がある場合

---

## 開発環境のセットアップ

### 必要なもの

- [Docker](https://www.docker.com/) および Docker Compose
- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+

### セットアップ手順

```bash
# リポジトリをクローン
git clone https://github.com/<your-fork>/jukugi-bot.git
cd jukugi-bot

# 依存関係のインストール
pnpm install

# 環境変数の設定
cp apps/backend/.dev.vars.example apps/backend/.dev.vars
# .dev.vars を編集して必要な値を設定する

# ローカル開発サーバーの起動 (Docker 推奨)
docker-compose up
```

開発サーバーは以下のポートで起動します。

| サービス | URL |
|---------|-----|
| フロントエンド | http://localhost:5173 |
| バックエンド API | http://localhost:8787 |
| API ドキュメント (Swagger) | http://localhost:8787/api/docs |

### よく使うコマンド

```bash
pnpm build                              # 全体ビルド
pnpm typecheck                          # TypeScript 型チェック
pnpm biome:check                        # Lint + フォーマットチェック
pnpm biome:format                       # 自動フォーマット
pnpm --filter backend test              # バックエンドテスト実行
pnpm --filter backend db:generate       # DB マイグレーション生成
pnpm --filter frontend generate:api     # API クライアント再生成
```

---

## コードスタイル

本プロジェクトは [Biome](https://biomejs.dev/) でコードスタイルを統一しています。

| ルール | 設定 |
|--------|------|
| インデント | タブ |
| クォート | ダブルクォート |
| 最大行長 | 100文字 |
| import 順序 | Biome が自動整理 |

PR を送る前に必ず `pnpm biome:check` を実行してください。
`pnpm biome:format` で自動修正できます。

### 追加ルール

- `any` 型・`as any` キャストは使用禁止。境界では `unknown` + `zod.safeParse()` を使う
- `@ts-ignore` / `@ts-expect-error` を使う場合は、同じ行に理由をコメントする
- バックエンドの全エンドポイントは `@hono/zod-openapi` で定義する (素の Hono ルート追加禁止)
- フロントエンドの UI は必ず Design System (`app/components/design-system/`) 経由で実装する

---

## テスト

### バックエンド

```bash
pnpm --filter backend test              # 全テスト実行
pnpm --filter backend test:watch        # ウォッチモード
```

- 新しい API エンドポイントには必ず対応するテストを `apps/backend/test/` に追加してください
- ビジネスロジック (投票集計・発言キュー・フェーズ遷移) はユニットテストで網羅してください

### フロントエンド

現在フロントエンドの自動テストは整備中です。UI 変更時は手動での動作確認を行い、PR の説明に確認手順を記載してください。

---

## コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/) 形式を推奨します。

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### type 一覧

| type | 用途 |
|------|------|
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `docs` | ドキュメントのみの変更 |
| `style` | コードの動作に影響しない変更 (フォーマット等) |
| `refactor` | バグ修正・機能追加を伴わないリファクタリング |
| `test` | テストの追加・修正 |
| `chore` | ビルドプロセス・補助ツールの変更 |
| `perf` | パフォーマンス改善 |

### 例

```
feat(transition): add configurable approval threshold per phase

fix(speaking): prevent timer overflow on interruption cooldown

docs(contributing): add pull request checklist
```

---

## ブランチ戦略

| ブランチ | 用途 |
|---------|------|
| `main` | 本番リリースブランチ (直接プッシュ禁止) |
| `feat/<description>` | 新機能開発 |
| `fix/<description>` | バグ修正 |
| `docs/<description>` | ドキュメント修正 |
| `chore/<description>` | ビルド・設定変更 |

ブランチ名は英語の小文字とハイフンで記述してください。

---

質問・不明点がある場合は、遠慮なく Issue を立てて議論してください。
このプロジェクトに貢献する仲間をお待ちしています。
