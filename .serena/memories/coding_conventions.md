# コーディング規約とスタイル

## 一般的な規約

- **言語**: TypeScript 5
- **エンコーディング**: UTF-8
- **パッケージマネージャー**: pnpm のみ使用 (`npx only-allow pnpm` でチェック)
- **フォーマッター**: Prettier
- **リンター**: ESLint, Knip

## テストコーディング規約

### Result型のテストでの型縛り

Result型（neverthrowなど）のテストで、`.isOk()`や`.isErr()`の結果に基づいて型を縛りたい場合は、`expect.assert()`を使用する。

**良い例:**

```typescript
it("should return err with descriptive error", () => {
  const result = validateTransition("blocked", "completed");
  expect.assert(result.isErr());
  // この時点でTypeScriptはresult.errorが存在することを理解する
  expect(result.error.message).toBe("...");
});
```

**悪い例:**

```typescript
it("should return err with descriptive error", () => {
  const result = validateTransition("blocked", "completed");
  expect(result.isErr()).toBe(true);
  if (result.isErr()) {
    // 不要な条件分岐
    expect(result.error.message).toBe("...");
  }
});
```

## コード構造

### ディレクトリ構成

- **handlers/**: HTTPエンドポイント（Hono）
- **usecases/**: ビジネスロジック
- **objects/**: ドメインモデル（Event Sourcing decider）
- **repos/**: データアクセス層
- **middleware/**: Hono ミドルウェア
- **services/**: サービス層
- **clients/**: 外部APIクライアント

### エラーハンドリング

- Result型 (`neverthrow`) を使用
- カスタムエラークラス: `BadRequestError`, `NotFoundError` など (`@/errors`)

### セキュリティ

- **Slackへ送信しないもの**:
  - コード全文 / リポジトリの機密
  - 秘密鍵・トークン・環境変数の値
  - 生のエラーログ

- **Slackへ送信するもの**:
  - 抽象的な進捗サマリ
  - ブロッキング・休止の要約
  - 完了サマリと PR URL

### データベース

- Drizzle ORM を使用
- トランザクションでロック (`for("update")`) を使用
- UUIDv7 (`uuidv7()`) を ID に使用
- タイムスタンプは `timestamp(..., { withTimezone: true })` を使用

### OAuth実装

- PKCE (S256) をパブリッククライアントで必須化
- トークンはSHA-256でハッシュ化して保存
- タイミングセーフ比較 (`timingSafeCompare`) を使用
- 認可コードは1回のみ使用可能（トランザクション内で削除）

### Event Sourcing

- `evolve`: イベントから状態を更新
- `decide`: コマンドからイベントを決定
- `apply`: イベントを永続化
- `replay`: イベントから状態を再構築

### 命名規則

- **ファイル名**: kebab-case (`oauth.ts`, `task-sessions.ts`)
- **コンポーネント**: PascalCase (`TaskList.tsx`)
- **関数/変数**: camelCase (`getClient`, `accessToken`)
- **定数**: UPPER_SNAKE_CASE (`ACCESS_TOKEN_EXPIRY_MS`)
- **型**: PascalCase (`TaskState`, `Event`)
