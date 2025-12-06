# Task Session Repository - Domain-Driven Design Pattern

## 概要

状態遷移をドメインモデルで表現し、リポジトリ層と上手く連携させるアプローチ。

## アーキテクチャ

```
ユースケース層 → ドメインモデル → リポジトリ層(mapper) → データベース
```

### 従来の問題

```typescript
// ❌ ダサい変換関数が必要
await repository.createTask({
  status: convertStatusToDb(task.status), // 変換が必要
  kind: convertKindToDb(task.kind),
});
```

### 新しいアプローチ

```typescript
// ✅ ドメインモデルをそのまま渡せる
const startedTask: StartedTaskSession = {
  userId: user.id,
  workspaceId: workspace.id,
  issueProvider: issue.provider,
  issueId: issue.id ?? null,
  issueTitle: issue.title,
  initialSummary: initialSummary,
};

await repository.startTaskSession(startedTask);
```

## レイヤー構成

### 1. Model Layer (`src/models/taskSessions/index.ts`)

状態ごとのタスクを型で表現:

```typescript
// 開始されたタスク
export type StartedTaskSession = {
  userId: string;
  workspaceId: string;
  issueProvider: IssueProvider;
  issueId: string | null;
  issueTitle: string;
  initialSummary: string;
};

// 更新されたタスク
export type UpdatedTaskSession = {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
  summary: string;
  rawContext?: Record<string, unknown>;
};

// ... その他の状態
```

### 2. Mapper Layer (`src/repos/task-sessions/mapper.ts`)

ドメインモデル ↔ データベーススキーマの変換を一箇所に集約:

```typescript
export const taskSessionMapper = {
  toCreateRequest: (task: StartedTaskSession): CreateTaskSessionRequest => ({
    userId: task.userId,
    workspaceId: task.workspaceId,
    issueProvider: task.issueProvider,
    issueId: task.issueId,
    issueTitle: task.issueTitle,
    initialSummary: task.initialSummary,
  }),
  // ...
};
```

### 3. Repository Layer (`src/repos/task-sessions/index.ts`)

2つのインターフェースを提供:

#### A. プリミティブな関数（既存）

```typescript
export const createTaskSession =
  (db: Database) => async (params: CreateTaskSessionRequest) => {
    // ...
  };
```

#### B. ドメインモデルを受け取る関数（新規）

```typescript
export const startTaskSession =
  (db: Database) => (task: StartedTaskSession) => {
    return createTaskSession(db)(taskSessionMapper.toCreateRequest(task));
  };
```

## 使い方

### ユースケース層での使用例

```typescript
export const createStartTask = (taskRepository: TaskRepository) => {
  return async (input: StartTaskInput): Promise<StartTaskOutput> => {
    const { workspace, user, params } = input;

    // 1. ドメインモデルを構築（状態遷移の意図を明確に）
    const startedTask: StartedTaskSession = {
      userId: user.id,
      workspaceId: workspace.id,
      issueProvider: params.issue.provider,
      issueId: params.issue.id ?? null,
      issueTitle: params.issue.title,
      initialSummary: params.initialSummary,
    };

    // 2. リポジトリ層にドメインモデルを渡す
    const session = await taskRepository.startTaskSession(startedTask);

    // 以降の処理...
  };
};
```

## 利点

### 1. 変換関数が不要

```typescript
// ❌ Before
status: convertStatusToDb(status);

// ✅ After
taskRepository.startTaskSession(startedTask);
```

### 2. 状態遷移の意図が明確

型名で状態が分かる:

- `StartedTaskSession` - タスク開始
- `UpdatedTaskSession` - タスク更新
- `CompletedTaskSession` - タスク完了
- `BlockedTaskSession` - ブロック報告
- `PausedTaskSession` - 一時停止
- `ResumedTaskSession` - 再開

### 3. 型安全性

コンパイル時に状態遷移の妥当性をチェック:

```typescript
const completedTask: CompletedTaskSession = {
  // summary は必須（型で保証される）
  summary: "...",
  // rawContext は不要（完了時には保存しない）
};
```

### 4. テストが書きやすい

```typescript
const mockTask: StartedTaskSession = {
  userId: "user1",
  workspaceId: "ws1",
  issueProvider: "github",
  issueId: "123",
  issueTitle: "Test Issue",
  initialSummary: "Starting...",
};

await repository.startTaskSession(mockTask);
```

## 実装パターン

### パターン1: 既存のRequest型を使う（後方互換性）

```typescript
// 既存コードはそのまま動く
await taskRepository.createTaskSession({
  userId: user.id,
  workspaceId: workspace.id,
  // ...
});
```

### パターン2: ドメインモデルを使う（推奨）

```typescript
// 新規コードではドメインモデルを使う
const startedTask: StartedTaskSession = {
  userId: user.id,
  workspaceId: workspace.id,
  // ...
};
await taskRepository.startTaskSession(startedTask);
```

## 参考実装

- Models: `src/models/taskSessions/index.ts`
- Mapper: `src/repos/task-sessions/mapper.ts`
- Repository: `src/repos/task-sessions/index.ts`
- Usecase Example: `src/usecases/taskSessions/start-with-domain.ts`

## ディレクトリ構成

```
src/
├── models/
│   └── taskSessions/
│       └── index.ts              # 状態別タスクモデル定義
├── repos/
│   └── task-sessions/
│       ├── index.ts              # リポジトリ実装
│       ├── interface.ts          # 型定義（modelsをimport）
│       ├── mapper.ts             # モデル↔DB変換
│       └── README.md             # このファイル
└── usecases/
    └── taskSessions/
        └── start-with-domain.ts  # 使用例
```

依存関係: `usecase → models ← repos/interface ← repos/index`
