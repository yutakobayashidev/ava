# テストガイドライン

このドキュメントは、コードベース内でテストを書く際のベストプラクティスとガイドラインをまとめたものです。

## Result型のテスト

### `expect.assert()`を使った型縛り

Result型（neverthrowなど）のテストで、`.isOk()`や`.isErr()`の結果に基づいて型を縛りたい場合は、`expect.assert()`を使用します。

これにより、条件分岐なしでTypeScriptの型ナローイングを活用できます。

**良い例:**

```typescript
it("should return err with descriptive error", () => {
  const result = validateTransition("blocked", "completed");
  expect.assert(result.isErr());
  // この時点でTypeScriptはresult.errorが存在することを理解する
  expect(result.error.message).toBe(
    "Invalid status transition: blocked → completed. Allowed transitions from blocked: [in_progress, paused, cancelled]",
  );
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

### なぜ`expect.assert()`を使うのか

1. **型安全性**: TypeScriptの型ナローイングが自動的に適用される
2. **可読性**: 条件分岐が不要になり、テストコードがシンプルになる
3. **保守性**: テストの意図が明確になる

### 適用例

#### Result型の成功ケース

```typescript
it("should return ok for valid transitions", () => {
  const result = validateTransition("in_progress", "blocked");
  expect.assert(result.isOk());
  // result.valueに型安全にアクセス可能
});
```

#### Result型のエラーケース

```typescript
it("should return err when validation fails", () => {
  const result = someFunction();
  expect.assert(result.isErr());
  // result.errorに型安全にアクセス可能
  expect(result.error).toBeInstanceOf(BadRequestError);
  expect(result.error.message).toBe("Expected error message");
});
```

## ベストプラクティス

### 1. テストは読みやすく、保守しやすく

- テストケースは明確で理解しやすいものにする
- 不要な条件分岐を避ける
- `expect.assert()`を活用して型安全性を確保する

### 2. 一貫性を保つ

- プロジェクト全体で同じパターンを使用する
- Result型のテストでは常に`expect.assert()`を使用する

### 3. エラーメッセージを具体的に

- エラーケースのテストでは、期待されるエラーメッセージを明確にテストする
- ユーザーに表示されるエラーメッセージの品質を保証する
