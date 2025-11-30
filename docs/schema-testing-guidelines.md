# スキーマテストガイドライン

このドキュメントは、コードベース内のZodスキーマのテストを書く際のベストプラクティスとガイドラインをまとめたものです。

## 概要

スキーマテストは、Zodスキーマが入力データを正しく検証することを保証します。このガイドでは、保守性が高く型安全なスキーマテストを書くためのパターンを説明します。

## 型安全なテストフィクスチャ

### 型推論には `z.input` を使用する

テストフィクスチャを定義する際は、`z.input<typeof Schema>` を使用してスキーマから入力型を推論します。これにより型安全性が確保され、スキーマ定義とテストデータの乖離を防げます。

`z.input` を使う理由は、スキーマが唯一の型定義となり、別途型をエクスポートする必要がなくなるためです。また、`z.infer` は変換（transform）が適用された後の型を提供するのに対し、`z.input` は変換前の入力型を提供するため、テストデータの定義により適しています。

```typescript
import type { z } from "zod";
import { UserSchema } from "./user.schema";

// ✅ 良い例: z.inputを使用した型安全なフィクスチャ
const fixtures: z.input<typeof UserSchema>[] = [
  {
    name: "山田太郎",
    email: "yamada@example.com",
    age: 30,
  },
];

// ❌ 悪い例: 別途型をインポートする
import { type User } from "./user.schema";
const fixtures: User[] = [...];
```

### インポート順序

APIスキーマを扱う際は、常に `zod` から `z` 型をインポートします：

```typescript
import type { z } from "zod";
import { assert, describe, expect, it } from "vitest";
import { YourSchema } from "./your.schema";
```

## テストパターン

### 正常系テストケース

スキーマ検証を通過すべき有効な入力をテストします：

```typescript
describe("CreateUserSchema", () => {
  it("正常なデータの場合は成功する", () => {
    const fixtures: z.input<typeof CreateUserSchema>[] = [
      {
        name: "テストユーザー",
        email: "test@example.com",
      },
      // 他の有効なテストケースを追加
    ];

    for (const fixture of fixtures) {
      expect(fixture).toEqual(expect.schemaMatching(CreateUserSchema));
    }
  });
});
```

### 型制約を考慮した異常系テストケース

無効な入力をテストする場合、以下の2つの選択肢があります：

#### 選択肢1: 型として有効なエラーケースのみをテスト

型としては有効だが、検証で失敗すべきエッジケースに焦点を当てます：

```typescript
it("不正なデータの場合は失敗する", () => {
  const fixtures: [z.input<typeof CreateUserSchema>, string[]][] = [
    // 境界条件のテスト
    [
      {
        name: "", // 空文字列 - 型は有効だが最小長で失敗すべき
        email: "test@example.com",
      },
      ["String must contain at least 1 character(s)"],
    ],
    // フォーマット検証のテスト
    [
      {
        name: "テストユーザー",
        email: "invalid-email", // 無効なメールフォーマット
      },
      ["Invalid email"],
    ],
  ];

  for (const [fixture, errors] of fixtures) {
    const res = CreateUserSchema.safeParse(fixture);
    expect.assert(!res.success);
    expect(errors).toEqual(res.error.issues.map((e) => e.message));
  }
});
```

#### 選択肢2: 型として無効なテストケースを削除

厳密な型（enumなど）を持つスキーマでは、型として無効な入力のテストを避けます：

```typescript
// enum型の例: z.enum(["asc", "desc"])
describe("sortOrder", () => {
  it("正常なデータの場合は成功する", () => {
    const fixtures = ["asc", "desc"];

    for (const fixture of fixtures) {
      expect(sortOrder.safeParse(fixture).success).toBeTruthy();
    }
  });

  // ❌ "invalid"、123、nullなど型として無効な値はテストしない
  // TypeScriptコンパイラが既に型安全性を保証している
});
```

## ベストプラクティス

### 1. ビジネスロジックの検証に焦点を当てる

型システムの保証よりも、ビジネスルールと検証ロジックのテストを優先します：

- ✅ テストすべき: 最小/最大長、正規表現パターン、カスタムリファインメント
- ❌ スキップすべき: 誤った型（文字列 vs 数値）、null vs オブジェクト

### 2. 説明的なテスト名を使用する

テストが何を検証しているかを日本語または英語で一貫して記述します：

```typescript
it("メールアドレスの形式が不正な場合は失敗する", () => {
  // 無効なメールフォーマットをテスト
});

it("名前が80文字を超える場合は失敗する", () => {
  // 最大長の検証をテスト
});
```

### 3. 関連するテストをグループ化する

スキーマと検証の観点でテストを整理します：

```typescript
describe("UserSchema", () => {
  describe("nameフィールド", () => {
    it("有効な名前を受け入れる", () => {
      /* ... */
    });
    it("空の名前を拒否する", () => {
      /* ... */
    });
    it("100文字を超える名前を拒否する", () => {
      /* ... */
    });
  });

  describe("emailフィールド", () => {
    it("有効なメールフォーマットを受け入れる", () => {
      /* ... */
    });
    it("無効なメールフォーマットを拒否する", () => {
      /* ... */
    });
  });
});
```

### 4. 型システムの過剰なテストを避ける

TypeScriptとZodの型システムは既にコンパイル時の保証を提供しています。以下に焦点を当ててテストします：

- ランタイム検証ロジック
- ビジネスルール
- 型制約内のエッジケース
- カスタムリファインメントと変換

### 5. 一貫性を保つ

- すべてのスキーマテストで同じパターンを使用する
- 確立されたフィクスチャ構造に従う
- テストデータを現実的で意味のあるものに保つ

## 例

### 完全なテストファイルの例

```typescript
import type { z } from "zod";
import { assert, describe, expect, it } from "vitest";
import { CreateProductSchema, UpdateProductSchema } from "./product.schema";

describe("product.schema", () => {
  describe("CreateProductSchema", () => {
    it("正常なデータの場合は成功する", () => {
      const fixtures: z.input<typeof CreateProductSchema>[] = [
        {
          name: "テスト商品",
          price: 1000,
          description: "テスト用の商品",
          categoryId: "123e4567-e89b-12d3-a456-426614174000",
        },
        {
          name: "別の商品",
          price: 0, // エッジケースのテスト: 無料商品
          description: "無料商品",
          categoryId: "123e4567-e89b-12d3-a456-426614174000",
        },
      ];

      for (const fixture of fixtures) {
        expect(CreateProductSchema.safeParse(fixture).success).toBeTruthy();
      }
    });

    it("不正なデータの場合は失敗する", () => {
      const fixtures: [z.input<typeof CreateProductSchema>, string[]][] = [
        [
          {
            name: "", // 空の名前
            price: 1000,
            description: "テスト",
            categoryId: "123e4567-e89b-12d3-a456-426614174000",
          },
          ["String must contain at least 1 character(s)"],
        ],
        [
          {
            name: "テスト商品",
            price: -100, // 負の価格
            description: "テスト",
            categoryId: "123e4567-e89b-12d3-a456-426614174000",
          },
          ["Number must be greater than or equal to 0"],
        ],
      ];

      for (const [fixture, errors] of fixtures) {
        const res = CreateProductSchema.safeParse(fixture);
        expect.assert(!res.success);
        expect(errors).toEqual(res.error.issues.map((e) => e.message));
      }
    });
  });
});
```
