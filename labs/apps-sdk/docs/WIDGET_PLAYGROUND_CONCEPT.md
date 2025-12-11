# Widget Playground - コンセプトドキュメント

ChatGPT Widget開発のためのStorybook風プレイグラウンド環境

## 概要

Widget Playgroundは、ChatGPTウィジェットを**ChatGPTに接続せずに開発・テスト・ドキュメント化**できる開発ツールです。Storybookのウィジェット版として機能し、開発速度の向上と品質保証を両立します。

## 解決する課題

### 現在の開発フロー

```
コード変更 → ビルド → tunnelto → ChatGPT接続 → 動作確認
                                ↓
                        エラー発見した場合、最初から
```

**問題点:**

- ChatGPT接続が必須で、オフライン開発不可
- ネットワーク遅延で反映が遅い場合がある
- 複数の状態を並べて比較できない
- 非エンジニアがデザインレビューしづらい
- テスト自動化が困難

### Widget Playgroundでの開発フロー

```
コード変更 → HMR → /__playground/ で即座に確認
                ↓
        複数の状態を同時プレビュー
                ↓
        満足したらChatGPTで最終確認
```

**メリット:**

- オフライン開発可能
- 即座にフィードバック
- 視覚的テスト・回帰テスト対応
- デザイナーもプレビュー可能

---

## アーキテクチャ

### 1. ストーリー定義システム

#### ストーリーファイルの例

```typescript
// src/widgets/tasks/tasks.stories.tsx
import type { WidgetStory } from "@apps-sdk/widget-playground";
import type { Task } from "../../types";

export default {
  title: "Tasks Widget",
  component: "tasks",
  tags: ["autodocs"],
};

// 基本状態
export const Default: WidgetStory = {
  name: "デフォルト表示",
  args: {
    toolOutput: {
      structuredContent: {
        tasks: [
          {
            taskSessionId: "task-1",
            issueProvider: "github",
            issueId: "123",
            issueTitle: "Implement task widget",
            status: "inProgress",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        total: 1,
      },
    },
    theme: "light",
    displayMode: "inline",
  },
};

// 空の状態
export const Empty: WidgetStory = {
  name: "タスクがない状態",
  args: {
    toolOutput: {
      structuredContent: { tasks: [], total: 0 },
    },
  },
};

// 大量データ
export const ManyTasks: WidgetStory = {
  name: "20件のタスク",
  args: {
    toolOutput: {
      structuredContent: {
        tasks: Array.from({ length: 20 }, (_, i) => ({
          taskSessionId: `task-${i}`,
          issueProvider: i % 2 === 0 ? "github" : "manual",
          issueId: i % 2 === 0 ? `${i}` : null,
          issueTitle: `Task ${i + 1}`,
          status: ["inProgress", "completed", "paused", "blocked"][i % 4],
          createdAt: new Date(Date.now() - i * 3600000).toISOString(),
          updatedAt: new Date().toISOString(),
        })) as Task[],
        total: 20,
      },
    },
  },
};

// ダークモード
export const DarkMode: WidgetStory = {
  name: "ダークモード",
  args: {
    ...Default.args,
    theme: "dark",
  },
};

// モバイル表示
export const Mobile: WidgetStory = {
  name: "モバイル表示",
  args: {
    ...Default.args,
    displayMode: "pip",
    maxHeight: 400,
    userAgent: {
      device: { type: "mobile" },
      capabilities: { hover: false, touch: true },
    },
  },
};

// インタラクションテスト
export const WithInteraction: WidgetStory = {
  name: "タスククリック",
  args: Default.args,
  play: async ({ canvas, userEvent }) => {
    const taskItem = await canvas.findByText("Implement task widget");
    await userEvent.click(taskItem);
    // Expect some state change or action
  },
};
```

### 2. Playground UI構成

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
│              │  │   │ Task List Widget     │         │     │
│ 🎨 Controls  │  │   │                      │         │     │
│              │  │   │ No tasks found.      │         │     │
│ Theme:       │  │   │                      │         │     │
│  ○ Light     │  │   └──────────────────────┘         │     │
│  ● Dark      │  │                                    │     │
│              │  └────────────────────────────────────┘     │
│ Display:     │                                              │
│  [inline ▾]  │  Viewport: 📱 Mobile (375x667)              │
│              │                                              │
│ Max Height:  │  ┌────────────────────────────────────┐     │
│  [400px]     │  │ Controls                           │     │
│              │  ├────────────────────────────────────┤     │
│ 📱 Viewport  │  │ toolOutput:                        │     │
│  ○ Desktop   │  │ {                                  │     │
│  ● Mobile    │  │   "structuredContent": {           │     │
│  ○ Tablet    │  │     "tasks": [],                   │     │
│              │  │     "total": 0                     │     │
│              │  │   }                                │     │
│              │  │ }                                  │     │
│              │  │                                    │     │
│              │  │ [Copy State] [Reset]               │     │
│              │  └────────────────────────────────────┘     │
└──────────────┴──────────────────────────────────────────────┘
```

### 3. 技術実装

#### A. Vite Plugin: `vite-plugin-widget-playground`

```typescript
// packages/vite-plugin-widget-playground/src/index.ts
import type { Plugin } from "vite";
import { collectStories } from "./story-collector";
import { renderPlaygroundUI } from "./ui-renderer";

export interface WidgetPlaygroundOptions {
  storiesPattern?: string; // デフォルト: "src/widgets/**/*.stories.tsx"
  port?: number; // デフォルト: /__playground/
}

export function widgetPlayground(
  options: WidgetPlaygroundOptions = {},
): Plugin {
  const { storiesPattern = "src/widgets/**/*.stories.tsx" } = options;

  return {
    name: "widget-playground",

    configureServer(server) {
      // ストーリー一覧API
      server.middlewares.use(async (req, res, next) => {
        if (req.url === "/__playground/api/stories") {
          const stories = await collectStories(storiesPattern);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(stories));
          return;
        }

        // Playground UI
        if (req.url?.startsWith("/__playground/")) {
          const html = await renderPlaygroundUI(req.url);
          res.setHeader("Content-Type", "text/html");
          res.end(html);
          return;
        }

        next();
      });
    },

    // ストーリーファイルをHMR対象に
    handleHotUpdate({ file, server }) {
      if (file.endsWith(".stories.tsx")) {
        server.ws.send({
          type: "custom",
          event: "playground:stories-update",
        });
      }
    },
  };
}
```

#### B. モックグローバル注入

```typescript
// packages/widget-playground/src/mock-globals.ts
import type { OpenAiGlobals } from "@apps-sdk/types";

export function createMockOpenAI(config: StoryArgs): OpenAiGlobals {
  return {
    // 基本設定
    theme: config.theme || "light",
    displayMode: config.displayMode || "inline",
    maxHeight: config.maxHeight || 600,
    locale: config.locale || "ja",

    // デバイス情報
    userAgent: config.userAgent || {
      device: { type: "desktop" },
      capabilities: { hover: true, touch: false },
    },

    // Safe Area
    safeArea: config.safeArea || {
      insets: { top: 0, bottom: 0, left: 0, right: 0 },
    },

    // データ
    toolInput: config.toolInput || {},
    toolOutput: config.toolOutput || null,
    toolResponseMetadata: config.toolResponseMetadata || null,
    widgetState: config.widgetState || null,

    // API Mock
    setWidgetState: async (state) => {
      console.log("[Mock] setWidgetState:", state);
      return Promise.resolve();
    },

    callTool: async (name, args) => {
      console.log("[Mock] callTool:", name, args);
      return { result: "mocked response" };
    },

    sendFollowUpMessage: async ({ prompt }) => {
      console.log("[Mock] sendFollowUpMessage:", prompt);
    },

    openExternal: ({ href }) => {
      console.log("[Mock] openExternal:", href);
      window.open(href, "_blank");
    },

    requestDisplayMode: async ({ mode }) => {
      console.log("[Mock] requestDisplayMode:", mode);
      return { mode };
    },
  };
}
```

#### C. iframe分離プレビュー

```typescript
// packages/widget-playground/src/components/WidgetFrame.tsx
import { useEffect, useRef } from "hono/jsx";
import type { WidgetStory } from "../types";

export function WidgetFrame({ story, widget }: WidgetFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    // モックグローバルを注入
    iframe.contentWindow.postMessage(
      {
        type: "playground:inject-globals",
        globals: createMockOpenAI(story.args),
      },
      "*",
    );
  }, [story]);

  return (
    <iframe
      ref={iframeRef}
      src={`/__playground/widget/${widget}?story=${story.id}`}
      sandbox="allow-scripts allow-same-origin"
      style={{
        width: "100%",
        height: story.args.maxHeight || "600px",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
      }}
    />
  );
}
```

---

## 機能一覧

### Phase 1: MVP (最小実装)

- [ ] ストーリー定義の型システム
- [ ] `/__playground/` 基本UI (サイドバー + キャンバス)
- [ ] ストーリー一覧表示
- [ ] モックグローバル注入
- [ ] iframe分離プレビュー
- [ ] 基本的なHMR対応

**目標:** ChatGPT接続なしでウィジェットの基本動作を確認できる

### Phase 2: 拡張機能

- [ ] **テーマ切り替え** (light/dark)
- [ ] **デバイスプレビュー** (Mobile/Tablet/Desktop)
- [ ] **表示モード切り替え** (pip/inline/fullscreen)
- [ ] **Safe Area Insets シミュレーション**
- [ ] **インタラクティブコントロール** (JSON編集)
- [ ] **ストーリー検索・フィルタ**
- [ ] **URLでストーリー直リンク**

**目標:** 様々な状態・環境での表示を簡単にテストできる

### Phase 3: テスト自動化

- [ ] **Play関数サポート** (インタラクションテスト)
- [ ] **Visual Regression Testing** (スナップショット比較)
- [ ] **Playwright統合** (E2Eテスト)
- [ ] **Accessibility チェック** (axe-core統合)
- [ ] **CI/CD統合** (自動テスト実行)

**目標:** 品質保証の自動化

### Phase 4: 開発者体験向上

- [ ] **コンポーネントドキュメント自動生成**
- [ ] **Propsテーブル表示**
- [ ] **コードスニペット生成**
- [ ] **ストーリーのホットリロード**
- [ ] **複数ストーリー同時プレビュー**
- [ ] **パフォーマンス計測**

**目標:** Storybookと同等の開発体験

---

## ディレクトリ構成

```
labs/
├── apps-sdk/                    # メインアプリ
│   └── src/widgets/
│       └── tasks/
│           ├── index.tsx
│           ├── controller.tsx
│           └── tasks.stories.tsx  # ストーリー定義
│
└── vite-plugin-widget-playground/  # Playground plugin
    ├── src/
    │   ├── index.ts              # Vite plugin entry
    │   ├── story-collector.ts    # ストーリー収集
    │   ├── ui-renderer.tsx       # Playground UI
    │   ├── mock-globals.ts       # モックAPI
    │   └── components/
    │       ├── Sidebar.tsx
    │       ├── Canvas.tsx
    │       ├── WidgetFrame.tsx
    │       └── Controls.tsx
    ├── package.json
    └── tsconfig.json
```

---

## 使い方

### 1. ストーリー作成

```typescript
// src/widgets/hello/hello.stories.tsx
export default {
  title: "Hello Widget",
  component: "hello",
};

export const Basic: WidgetStory = {
  name: "基本表示",
  args: {
    toolOutput: { message: "Hello, World!" },
  },
};
```

### 2. Playground起動

```bash
pnpm dev
```

ブラウザで `http://localhost:5173/__playground/` にアクセス

### 3. ストーリー選択

サイドバーから "Hello Widget > Basic" を選択

### 4. リアルタイム編集

- コントロールパネルでJSON編集
- コード変更はHMRで即反映
- 複数ストーリーを切り替えて比較

---

## メリット

### 開発者

- **開発速度向上**: ChatGPT接続不要でイテレーション高速化
- **デバッグ効率化**: 複数状態を並べて問題箇所を特定
- **テスト自動化**: Play関数でインタラクションテスト
- **ドキュメント自動生成**: ストーリー = 使用例

### デザイナー

- **デザインレビュー**: エンジニア不要でプレビュー確認
- **レスポンシブ確認**: デバイス切り替えが簡単
- **ダークモード確認**: ワンクリックでテーマ切り替え

### QAエンジニア

- **回帰テスト**: Visual Regression Testing
- **エッジケース確認**: 空状態・エラー状態を簡単に再現
- **クロスブラウザ確認**: Playwright統合

---

## 既存Storybookとの違い

| 項目           | Storybook           | Widget Playground       |
| -------------- | ------------------- | ----------------------- |
| 対象           | Reactコンポーネント | ChatGPT Widget          |
| グローバル注入 | なし                | `window.openai` モック  |
| 表示環境       | ブラウザ            | ChatGPTサンドボックス風 |
| HMR            | ✅                  | ✅                      |
| Play関数       | ✅                  | ✅ (予定)               |
| Visual Testing | Addon               | 組み込み予定            |
| 軽量性         | 重い                | 軽量 (Vite plugin)      |

---

## 次のステップ

### 1. プロトタイプ実装 (1-2週間)

- vite-plugin-widget-playground パッケージ作成
- 基本的なストーリー表示
- モックグローバル注入

### 2. MVP完成 (2-3週間)

- サイドバー・キャンバスUI
- HMR対応
- 簡単なコントロールパネル

### 3. フィードバック収集 (1週間)

- 実際のウィジェット開発で使用
- 改善点の洗い出し

### 4. 拡張機能実装 (継続的)

- テーマ切り替え
- デバイスプレビュー
- Visual Regression Testing

---

## 参考リソース

- [Storybook](https://storybook.js.org/)
- [Ladle](https://ladle.dev/) - Viteベースの軽量Storybook代替
- [Histoire](https://histoire.dev/) - Vue/Svelte向けStorybook
- [Playwright](https://playwright.dev/)

---

## まとめ

Widget Playgroundは、ChatGPT Widget開発に特化したStorybookライクな開発環境です。

**コア価値:**

1. ChatGPT接続不要で高速イテレーション
2. 複数状態の並行プレビュー
3. テスト自動化対応
4. チーム全体で使えるツール

このツールにより、Widget開発の生産性が劇的に向上し、品質保証も強化されます。
