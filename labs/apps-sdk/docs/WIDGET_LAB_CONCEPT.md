# Widget Lab - ChatGPT Widget 開発の完全版フレームワーク

> ChatGPT Widget を **作る・試す・検証する・テストする・実際に動かす** すべてを一つにまとめたフルスタック開発基盤

## コンセプト

Widget Lab は、ChatGPT Widget 開発のための **2 レイヤーの開発体験** を提供します。

### 全体像

```
┌──────────────────────────────────────────────────────────┐
│                      Widget Lab                          │
│                                                          │
│  ┌──────────────────────────┬─────────────────────────┐ │
│  │    Playground Mode       │      Live Mode          │ │
│  │   (Storybook-like)       │     (Apps SDK)          │ │
│  ├──────────────────────────┼─────────────────────────┤ │
│  │ Mock window.openai       │ MCP Server              │ │
│  │ UI 状態一覧 / Controls   │ Hono Runtime            │ │
│  │ Device / Theme 切替      │ Vite HMR                │ │
│  │ Visual Regression        │ ChatGPT上で実行         │ │
│  │ MCP Client (optional)    │ 本番同等環境            │ │
│  └──────────────────────────┴─────────────────────────┘ │
│                                                          │
│         両者は同じウィジェットコード                     │
│         同じ構造 / Story / 型定義を共有                  │
└──────────────────────────────────────────────────────────┘
```

---

## 🎯 2 レイヤーの開発体験

### ① Live Mode（本番同等環境）

**ChatGPT 内で HMR が動く "本番同等" 開発環境**

#### 特徴

- ✅ **tunnelto 経由で ChatGPT が dev server にアクセス**

  ```
  ChatGPT → tunnelto.dev → localhost:5173 → Vite HMR
  ```

- ✅ **CSP で開発用ドメインを許可**

  ```typescript
  "openai/widgetCSP": {
    connect_domains: [devWidgetOrigin],  // HMR WebSocket
    resource_domains: [devWidgetOrigin], // JS/CSS
  }
  ```

- ✅ **Vite HMR が ChatGPT 内で生きている**
  - コード変更 → WebSocket 経由 → ChatGPT 内ウィジェット更新
  - ビルド不要、リロード不要

- ✅ **マルチウィジェット対応**
  - `src/widgets/*/index.tsx` を自動検出
  - 仮想モジュールシステムでルーティング

- ✅ **MCP Server と UI が統合**
  - `/mcp` → Hono (MCP protocol)
  - その他 → Vite dev server

- ✅ **本番と全く同じ sandbox で動作**
  - ChatGPT の iframe sandbox
  - CSP 制約
  - OpenAI Widget API

#### ユースケース

- **最終確認**: ChatGPT 内での実際の動作を確認
- **本番デバッグ**: 本番環境と同じ制約下でのデバッグ
- **E2E テスト**: ChatGPT との統合テスト

#### 価値

**何にも代替できない唯一無二の価値**

MCP Inspector はプロトコルを見るだけ。Live Mode は ChatGPT の実際のサンドボックス内で動作する。

---

### ② Playground Mode（高速開発環境）

**ChatGPT 接続不要で動く Storybook 的 UI 開発環境**

#### 特徴

- ✅ **ChatGPT の `window.openai` 環境のモック**

  ```typescript
  createMockOpenAI({
    theme: "dark",
    displayMode: "inline",
    toolOutput: { ... },
  })
  ```

- ✅ **UI 状態を Story として定義**

  ```typescript
  export const Empty: WidgetStory = {
    name: "タスクがない状態",
    args: { toolOutput: { tasks: [], total: 0 } },
  };
  ```

- ✅ **テーマ、デバイス、SafeArea の切り替え**
  - Light / Dark mode
  - Mobile / Tablet / Desktop
  - SafeArea insets シミュレーション

- ✅ **Visual Regression Testing**
  - スナップショット比較
  - UI の意図しない変更を検出

- ✅ **Play function によるインタラクションテスト**

  ```typescript
  play: async ({ canvas, userEvent }) => {
    const button = await canvas.findByRole("button");
    await userEvent.click(button);
  };
  ```

- ✅ **MCP Live 接続オプション**
  - Playground から実際の MCP Server に接続
  - 実データでの動作確認

- ✅ **オフラインでも動く**
  - ネットワーク不要
  - 高速イテレーション

#### UI 構成

```
┌─────────────────────────────────────────────────────────────┐
│ Widget Playground                        [Dark Mode Toggle] │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│  Sidebar     │  Canvas                                      │
│              │                                              │
│ 📦 Tasks     │  ┌────────────────────────────────────┐     │
│   ○ Default  │  │                                    │     │
│   ● Empty    │  │   Widget Preview                   │     │
│   ○ Many     │  │   (iframe with mock globals)       │     │
│   ○ Dark     │  │                                    │     │
│   ○ Mobile   │  │   ┌──────────────────────┐         │     │
│              │  │   │ No tasks found.      │         │     │
│ 🎨 Theme     │  │   └──────────────────────┘         │     │
│   ○ Light    │  │                                    │     │
│   ● Dark     │  └────────────────────────────────────┘     │
│              │                                              │
│ 📱 Device    │  ┌────────────────────────────────────┐     │
│   ○ Mobile   │  │ Controls                           │     │
│   ● Desktop  │  ├────────────────────────────────────┤     │
│   ○ Tablet   │  │ toolOutput:                        │     │
│              │  │ { "tasks": [], "total": 0 }        │     │
│ 🔌 MCP       │  │                                    │     │
│   ○ Mock     │  │ [Live MCP Connect]                 │     │
│   ○ Live     │  └────────────────────────────────────┘     │
└──────────────┴──────────────────────────────────────────────┘
```

#### ユースケース

- **UI デザイン**: デザイナーと協業
- **状態検証**: Empty / Loading / Error 状態の確認
- **レスポンシブ確認**: 各デバイスでの表示確認
- **リグレッションテスト**: UI の意図しない変更を検出
- **ドキュメント**: Story = 使用例 = ドキュメント

#### 価値

**ローカルで高速開発 + UI 品質保証ツール**

ChatGPT に接続せずに UI 開発を完結できる。開発速度が劇的に向上。

---

## 🔄 2 モードの統合

### 同じコードベース、異なる実行環境

```typescript
// src/widgets/tasks/index.tsx
// ↓ Live Mode では ChatGPT 内で実行
// ↓ Playground Mode ではモック環境で実行

const root = document.getElementById("tasks-root");
if (root) {
  const { tasks, total } = getInitialData(); // どちらのモードでも動く
  render(<TaskApp tasks={tasks} total={total} />, root);
}
```

### Story の再利用

```typescript
// src/widgets/tasks/tasks.stories.tsx

// Playground で定義した Story
export const Empty: WidgetStory = {
  args: { toolOutput: { tasks: [], total: 0 } },
};

// ↓ Live Mode でも使える
// MCP Server が同じ toolOutput を返せば同じ状態を再現
```

### データフロー

```
Playground Mode:
Story → Mock openai → Widget → UI 表示

Live Mode:
ChatGPT → MCP Server → Widget HTML (script src) → Vite → HMR
```

---

## 💎 統合後に得られるメリット

### 1. ウィジェット開発の入口から出口までカバー

```
① UI デザイン     → Playground Mode
② 状態検証        → Playground Mode (Story)
③ 実データ検証    → Playground Mode (MCP Live)
④ ChatGPT 内確認  → Live Mode
```

**全てを一つのフレームワークで完結できる**

### 2. Story が多目的に使える

```
Story = ┌─ UI 仕様
        ├─ テストケース
        ├─ 動作例
        ├─ ドキュメント
        └─ デバッグ用状態
```

**一度定義すれば、複数の用途で活用**

### 3. MCP Apps が標準化されても揺るがない

| ツール            | 目的              | 対象       |
| ----------------- | ----------------- | ---------- |
| **MCP Inspector** | プロトコル確認    | エンジニア |
| **Widget Lab**    | UI + MCP 統合開発 | 全チーム   |

**競合しない、完全に別領域**

### 4. チーム全員が使える

- **エンジニア**: Live Mode で本番確認、Playground でテスト
- **デザイナー**: Playground でデザイン確認、レスポンシブチェック
- **QA**: Playground で Visual Regression、インタラクションテスト
- **PM**: Playground でデモ、仕様確認

**全員が同じツールで協業できる**

---

## 🏗️ アーキテクチャ

### パッケージ構成

```
labs/
├── apps-sdk/                         # メインアプリ
│   ├── src/
│   │   ├── server/                   # MCP Server (Live Mode)
│   │   │   ├── app.ts
│   │   │   └── widget.tsx
│   │   └── widgets/                  # ウィジェット
│   │       └── tasks/
│   │           ├── index.tsx         # ウィジェット本体
│   │           ├── controller.tsx
│   │           └── tasks.stories.tsx # Story 定義
│   └── vite.config.ts                # Live Mode 設定
│
├── vite-plugin-widget/               # 既存プラグイン
│   └── src/index.ts                  # マルチウィジェット対応
│
└── vite-plugin-widget-playground/    # 新規プラグイン
    ├── src/
    │   ├── index.ts                  # Vite plugin entry
    │   ├── story-collector.ts        # Story 収集
    │   ├── ui/                       # Playground UI
    │   │   ├── Sidebar.tsx
    │   │   ├── Canvas.tsx
    │   │   ├── WidgetFrame.tsx
    │   │   └── Controls.tsx
    │   ├── mock-globals.ts           # window.openai モック
    │   └── mcp-client.ts             # MCP Live 接続
    └── package.json
```

### Vite 設定統合

```typescript
// apps-sdk/vite.config.ts
import { multiWidgetDevEndpoints } from "@apps-sdk/vite-plugin-widget";
import { widgetPlayground } from "@apps-sdk/vite-plugin-widget-playground";

export default defineConfig({
  plugins: [
    // Playground Mode
    widgetPlayground({
      storiesPattern: "src/widgets/**/*.stories.tsx",
      mcpEndpoint: "http://localhost:5173/mcp", // Live MCP 接続
    }),

    // Live Mode
    devServer({ entry: "src/server/app.ts" }),
    multiWidgetDevEndpoints({ entries: widgetEntries }),
  ],
});
```

### エンドポイント

| パス                         | 機能                   | モード     |
| ---------------------------- | ---------------------- | ---------- |
| `/__playground/`             | Playground UI          | Playground |
| `/__playground/api/stories`  | Story 一覧 API         | Playground |
| `/__playground/widget/:name` | ウィジェットプレビュー | Playground |
| `/mcp`                       | MCP Server             | Live       |
| `/tasks.html`                | ウィジェット開発用     | Live       |
| `/tasks.js`                  | ウィジェット JS (HMR)  | Live       |

---

## 📖 使い方

### Playground Mode

```bash
# 開発サーバー起動
pnpm dev

# Playground を開く
open http://localhost:5173/__playground/
```

**ストーリー定義:**

```typescript
// src/widgets/tasks/tasks.stories.tsx
export default {
  title: "Tasks Widget",
  component: "tasks",
};

export const Empty: WidgetStory = {
  name: "タスクがない状態",
  args: {
    toolOutput: { structuredContent: { tasks: [], total: 0 } },
    theme: "light",
  },
};

export const DarkMode: WidgetStory = {
  name: "ダークモード",
  args: {
    ...Empty.args,
    theme: "dark",
  },
};
```

**Playground で確認:**

1. サイドバーから "Tasks Widget > Empty" を選択
2. コントロールでテーマを変更
3. デバイスを切り替え
4. コード変更は即座に反映

### Live Mode

```bash
# 開発サーバー起動
pnpm dev

# tunnelto で公開
pnpm dev:tunnel
```

**ChatGPT で確認:**

1. ChatGPT の設定で MCP Server を追加
   ```
   https://your-tunnel.tunnelto.dev/mcp
   ```
2. ChatGPT で "Show task list" と入力
3. ウィジェットが表示される
4. コード変更は HMR で即座に反映

### MCP Live 接続 (Playground から)

```typescript
// Playground UI で
[🔌 MCP Live Connect] ボタンをクリック

// 実際の MCP Server から toolOutput を取得
// ↓
// Playground で実データプレビュー
```

---

## 🎯 開発フロー

### 理想的なワークフロー

```
① Playground で UI デザイン
   ↓ Story 定義、テーマ確認、レスポンシブ確認

② Playground でインタラクションテスト
   ↓ Play function で自動化

③ MCP Live 接続で実データ確認
   ↓ 実際の MCP Server と接続

④ Live Mode で ChatGPT 内確認
   ↓ 本番同等環境での最終チェック

⑤ Visual Regression でリグレッション防止
   ↓ 自動スナップショット比較
```

---

## 🚀 ロードマップ

### Phase 1: Playground MVP (2-3週間)

- [ ] vite-plugin-widget-playground パッケージ作成
- [ ] Story 型定義システム
- [ ] 基本的な Playground UI
- [ ] Mock window.openai 実装
- [ ] iframe プレビュー
- [ ] HMR 対応

**目標:** ChatGPT 接続なしで基本的な UI 開発ができる

### Phase 2: 統合機能 (2-3週間)

- [ ] テーマ切り替え (light/dark)
- [ ] デバイスプレビュー (Mobile/Tablet/Desktop)
- [ ] SafeArea insets シミュレーション
- [ ] MCP Live 接続機能
- [ ] Story 検索・フィルタ
- [ ] URL 直リンク

**目標:** Playground と Live Mode がシームレスに連携

### Phase 3: テスト自動化 (2-3週間)

- [ ] Play function サポート
- [ ] Visual Regression Testing
- [ ] Playwright 統合
- [ ] Accessibility チェック (axe-core)
- [ ] CI/CD 統合

**目標:** 品質保証の自動化

### Phase 4: 開発者体験向上 (継続的)

- [ ] コンポーネントドキュメント自動生成
- [ ] Props テーブル表示
- [ ] コードスニペット生成
- [ ] パフォーマンス計測
- [ ] 複数ストーリー同時プレビュー

**目標:** Storybook 以上の開発体験

---

## 🎨 デザイン原則

### 1. ゼロコンフィグ

```typescript
// ストーリー定義だけで動く
export const Empty: WidgetStory = { ... };

// vite.config.ts は最小限
plugins: [widgetPlayground()]
```

### 2. 型安全

```typescript
// window.openai の型がそのまま使える
import type { OpenAiGlobals } from "@apps-sdk/types";

export const story: WidgetStory<OpenAiGlobals> = { ... };
```

### 3. 高速

- Vite ベースで超高速 HMR
- iframe 分離でメインスレッドブロックなし
- 仮想モジュールシステムで効率化

### 4. 拡張可能

```typescript
// カスタムコントロール追加
export const story: WidgetStory = {
  args: { ... },
  controls: {
    customField: { type: "select", options: [...] }
  }
};
```

---

## 🌟 既存ツールとの比較

| 項目               | MCP Inspector | Storybook        | Widget Lab      |
| ------------------ | ------------- | ---------------- | --------------- |
| **対象**           | MCP Protocol  | React Components | ChatGPT Widgets |
| **UI開発**         | ❌            | ✅               | ✅              |
| **MCP統合**        | ✅            | ❌               | ✅              |
| **本番環境確認**   | ❌            | ❌               | ✅ (Live Mode)  |
| **HMR**            | ❌            | ✅               | ✅ (両モード)   |
| **Visual Testing** | ❌            | Addon            | ✅ 組み込み     |
| **軽量性**         | ✅            | ❌               | ✅              |
| **オフライン**     | ❌            | ✅               | ✅ (Playground) |
| **ChatGPT内動作**  | ❌            | ❌               | ✅ (Live Mode)  |

**Widget Lab の独自性:**

- MCP Server + UI を統合
- ChatGPT の実サンドボックスで動作確認
- Playground と Live の 2 レイヤー統合

---

## 📝 まとめ

### Widget Lab のコア価値

1. **完全な開発フロー**
   - UI デザイン → 検証 → テスト → 本番確認

2. **2 レイヤーの統合**
   - Playground: 高速開発 + 品質保証
   - Live: 本番同等環境での確認

3. **唯一無二の Live Mode**
   - ChatGPT 内で HMR が動く
   - 本番と同じ制約下でのデバッグ

4. **チーム全員が使える**
   - エンジニア、デザイナー、QA、PM

5. **Story ベースの開発**
   - 仕様 = テスト = ドキュメント

### Next Steps

1. **Phase 1 プロトタイプ実装**
   - vite-plugin-widget-playground 作成
   - 基本的な Playground UI

2. **フィードバック収集**
   - 実際の開発で使用
   - 改善点の洗い出し

3. **Phase 2-4 の継続実装**
   - 機能拡張
   - テスト自動化
   - DX 向上

---

**Widget Lab = ChatGPT Widget 開発の唯一無二の DX 基盤**
