# AGENTS.md

## Mission

報告・連絡・相談が苦手な人でも、
AI が自動で「外部化」を手伝ってくれる世界をつくる。

- 過集中でも黙り込んでも信頼が落ちない
- プロセスごと公平に評価される
- チームは透明性に支えられる
- マイクロマネジメントが不要になる

エンジニアは、コードに集中していい。
報連相は AI に任せよう。

---

## アーキテクチャ概要

```
AIエージェント（LLM）
 ↓ 自然言語
ローカル MCP サーバ
 ↓ JSON-RPC（SSE/HTTP）
クラウド Task API
 ↓ Slack Web API
Slack：タスクごとのスレッド
```

クラウドへ送るのは

- **抽象的な進捗**
- **詰まり情報**
- **完了通知**

のみであり、
コードや機密情報はローカルに留めます。

---

## 認可モデル（OAuth 統一）

| 対象                             | 認可方式             | 目的           |
| -------------------------------- | -------------------- | -------------- |
| Slack ワークスペース             | Slack OAuth          | チーム管理権限 |
| MCP クライアント（エージェント） | MCP OAuth 2.1 + PKCE | 操作者の識別   |

### API 呼び出し時のヘッダ

```
Authorization: Bearer <access_token>
```

※ トークンは短命・スコープ制御

---

## MCP Tools（実装すべき API）

Coding Agent は以下の MCP ツールを使用します。

### 1. `start_task`

Slack に「開始スレッド」を作成。

```ts
start_task({
  issue: {
    provider: "github" | "manual",
    id?: string,
    title: string,
  },
  initial_summary: string,
}) => {
  task_session_id: string
}
```

### 2. `update_task`

進捗の更新。

```ts
update_task({
  task_session_id: string,
  summary: string,
  raw_context: Record<string, unknown>,
});
```

### 3. `report_blocked`

停滞・ハマりを通知。

```ts
report_blocked({
  task_session_id: string,
  reason: string,
  raw_context: Record<string, unknown>,
});
```

### 4. `complete_task`

作業完了を宣言。

```ts
complete_task({
  task_session_id: string,
  pr_url: string,
  summary: string,
});
```

---

## Cloud Task API（内部で呼ばれる）

| 動作   | Endpoint              | Method |
| ------ | --------------------- | ------ |
| 開始   | `/api/tasks/start`    | POST   |
| 更新   | `/api/tasks/update`   | POST   |
| 詰まり | `/api/tasks/blocked`  | POST   |
| 完了   | `/api/tasks/complete` | POST   |

※ MCP サーバが代行して呼び出します
※ Coding Agent は直接 HTTP 通信を意識しません

---

## MCP OAuth 認証フロー（簡易）

```
MCP Client → Auth Request
  ↓
Auth Server: 認可
  ↓ (PKCE)
Access Token発行
  ↓
Request with Authorization Header
```

将来的には Slack 権限と統合し
ロール管理・チーム管理に拡張可能。

---

## セキュリティポリシー

クラウドへ送信 **禁止**：

- コード全文
- Git 管理下の機密情報
- 秘密鍵・トークン
- 生のエラーメッセージ

クラウドへ送信 **許可 / 推奨**：

- 概要サマリ（自然言語）
- 作業の意図・方向性
- ハマりの抽象的根拠

---

## MCP サーバ環境設定

OAuth に必要な情報は MCP サーバ側で管理：

```env
MCP_CLIENT_ID=<client-id>
MCP_CLIENT_SECRET=<secret>  # PKCE利用時は保持しない構成も可
TASK_API_BASE_URL=https://api.example.com
TOKEN_ENDPOINT=https://api.example.com/oauth/token
AUTH_ENDPOINT=https://api.example.com/oauth/authorize
```

---

## 使用例（擬似コード）

```js
const { task_session_id } = start_task({
  issue: { provider: "manual", title: "ログインUI改善" },
  initial_summary: "フォームバリデーション改善に着手",
});

update_task({
  task_session_id,
  summary: "必須項目チェックを追加",
});

report_blocked({
  task_session_id,
  reason: "本番だけ500が出て再現できない",
});

complete_task({
  task_session_id,
  summary: "原因は外部APIの遅延、リトライ導入で解消",
});
```

Slack でリアルタイムにスレッド更新が行われます。

---

## 拡張予定（後方互換）

- Slack → MCP 制御（停止／再開）
- Issue 自動推定
- LLM による進捗要約高度化
- Enterprise 向け監査証跡
- 権限スコープの細分化

---
