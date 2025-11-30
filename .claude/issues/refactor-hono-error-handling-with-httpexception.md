---
name: 新機能追加・改善
about: 新機能や改善案、リファクタリングなどのタスクの場合
title: ""
labels: ""
assignees: ""
---

## 概要

- HonoのAPIでエラーレスポンスを返している部分をHTTPExceptionを使うように変更する

## 背景・目的

- Honoの標準的なエラーハンドリング方法であるHTTPExceptionを使うことで、コードの一貫性と保守性を向上させる
- エラーハンドリングを統一することで、エラーレスポンスの形式を標準化できる
- `create-app.ts`にすでにHTTPExceptionハンドラーが実装されているため、それを活用する

## 完了条件

- `src/handlers/api/oauth.ts`の全エラーレスポンス（約18箇所）をHTTPExceptionに置き換える
- `src/handlers/api/auth.ts`の全エラーレスポンス（2箇所）をHTTPExceptionに置き換える
- `src/middleware/slack.ts`の全エラーレスポンス（3箇所）をHTTPExceptionに置き換える
- 既存のテストが引き続きパスすることを確認する

## 参考情報・補足

### 現在のエラーハンドリング

```typescript
return c.json({ error: "invalid_client" }, 401);
```

### 変更後のエラーハンドリング

```typescript
throw new HTTPException(401, { message: "invalid_client" });
```

### 該当ファイル

- `src/handlers/api/oauth.ts` - 18箇所
- `src/handlers/api/auth.ts` - 2箇所
- `src/middleware/slack.ts` - 3箇所

`create-app.ts`のonErrorハンドラーがHTTPExceptionを処理する仕組みはすでに実装済み
