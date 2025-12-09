# Architecture Documentation

このドキュメントでは、Avaアプリケーションのアーキテクチャパターンと設計原則について説明します。

## Table of Contents

- [Event Sourcing Pipeline](#event-sourcing-pipeline)
- [Error Handling](#error-handling)
- [Workflow Pattern](#workflow-pattern)
- [Repository Pattern](#repository-pattern)

## Event Sourcing Pipeline

タスクセッション管理では、Event Sourcingパターンを採用しています。すべての状態変更はイベントとして記録され、イベントストリームから現在の状態を再構築します。

### Pipeline Stages (Typestate Pattern)

コマンド実行は以下の5つのステージを順に通過します。各ステージは型で表現され、コンパイル時に正しい順序が保証されます。

```typescript
Unloaded → Loaded → Decided → Committed → Projected
```

#### 1. Unloaded

初期状態。ユーザーからのコマンドを受け取った状態。

```typescript
type UnloadedCommand = {
  kind: "unloaded";
  streamId: string;
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  command: Command;
};
```

#### 2. Loaded

イベントストリームをロードし、現在の状態を再構築した状態。

```typescript
type LoadedCommand = {
  kind: "loaded";
  streamId: string;
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  command: Command;
  history: Event[];
  state: ReturnType<typeof replay>;
};
```

**処理内容:**

- Event Storeからイベント履歴をロード
- `replay()`関数で履歴から現在の状態を再構築

#### 3. Decided

コマンドから新しいイベントを決定した状態。

```typescript
type DecidedCommand = {
  kind: "decided";
  streamId: string;
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  state: ReturnType<typeof replay>;
  newEvents: Event[];
  expectedVersion: number;
};
```

**処理内容:**

- `decide()`関数でコマンドと現在の状態から新しいイベントを生成
- ビジネスルールの検証（例: ブロック中は進捗更新不可）をResult型で表現
- 無効な状態遷移の場合は`err(BadRequestError)`を返す
- 楽観的同時実行制御のためのバージョン番号を記録

#### 4. Committed

イベントを永続化した状態。

```typescript
type CommittedCommand = {
  kind: "committed";
  streamId: string;
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  state: ReturnType<typeof replay>;
  newEvents: Event[];
  persistedEvents: schema.TaskEvent[];
  version: number;
};
```

**処理内容:**

- Event Storeにイベントを追加
- 楽観的同時実行制御によるバージョン競合検出
- トランザクション内で複数イベントをアトミックに保存

#### 5. Projected

プロジェクション（読み取りモデル）を更新した状態。

```typescript
type ProjectedCommand = {
  kind: "projected";
  events: Event[];
  persistedEvents: schema.TaskEvent[];
  state: ReturnType<typeof replay>;
  version: number;
};
```

**処理内容:**

- `task_sessions`テーブル（読み取りモデル）を更新
- `task_policy_outbox`にSlack通知などのポリシーイベントをキュー
- アウトボックスパターンで非同期処理を実行

### Pipeline Implementation

各ステージ間の遷移は純粋関数として実装されています:

```typescript
const loadEvents =
  (eventStore: EventStore) =>
  (command: UnloadedCommand): ResultAsync<LoadedCommand, DatabaseError> => {
    return eventStore.load(command.streamId).map((history) => ({
      ...command,
      kind: "loaded",
      history,
      state: replay(command.streamId, history),
    }));
  };

const decideEvents = (
  command: LoadedCommand,
): Result<DecidedCommand, BadRequestError | NotFoundError> => {
  return decide(command.state, command.command, new Date()).map(
    (newEvents) => ({
      ...command,
      kind: "decided",
      newEvents,
      expectedVersion: command.history.length - 1,
    }),
  );
};

const commitEvents =
  (eventStore: ReturnType<typeof createEventStore>) =>
  (command: DecidedCommand): ResultAsync<CommittedCommand, DatabaseError> => {
    return eventStore
      .append(command.streamId, command.expectedVersion, command.newEvents)
      .map((appendResult) => ({
        ...command,
        kind: "committed",
        persistedEvents: appendResult.persistedEvents,
        version: appendResult.newVersion,
      }));
  };

const projectEvents =
  (db: Database) =>
  (command: CommittedCommand): ResultAsync<ProjectedCommand, DatabaseError> => {
    return projectTaskEvents(db, command.streamId, command.newEvents, {
      workspaceId: command.workspace.id,
      userId: command.user.id,
    })
      .andThen(() =>
        queuePolicyEvents(db, command.streamId, command.newEvents, {
          workspaceId: command.workspace.id,
          user: {
            id: command.user.id,
            name: command.user.name,
            email: command.user.email,
            slackId: command.user.slackId,
          },
          channel:
            command.state.slackThread?.channel ??
            command.workspace.notificationChannelId ??
            null,
          threadTs: command.state.slackThread?.threadTs ?? null,
        }),
      )
      .andThen(() =>
        processTaskPolicyOutbox(db).orElse((error) => {
          console.error("Failed to process task policy outbox", error);
          return okAsync(undefined);
        }),
      )
      .map(() => ({
        kind: "projected",
        events: command.newEvents,
        persistedEvents: command.persistedEvents,
        state: command.state,
        version: command.version,
      }));
  };
```

パイプライン全体の実行:

```typescript
return ok(command)
  .asyncAndThen(loadEvents(eventStore))
  .andThen(decideEvents)
  .andThen(commitEvents(eventStore))
  .andThen(projectEvents(db));
```

### 利点

1. **型安全性**: 各ステージの型が明示的なので、誤った順序でのアクセスをコンパイル時に防止
2. **テスタビリティ**: 各関数が純粋なので、単体テストが容易
3. **保守性**: データフローが明確で、各ステージの責務が分離されている
4. **拡張性**: 新しいステージの追加や既存ステージの変更が局所的

## Error Handling

Result型（`neverthrow`ライブラリ）を使用して、エラーを型として表現します。

### Error Types

#### ValidationError

**用途**: ドメインロジックによる検証エラー、ビジネスルール違反

**例:**

- Concurrency conflict（楽観的同時実行制御の競合）
- プラン制限超過
- ブロック中の進捗更新試行

```typescript
if (currentVersion !== expectedVersion) {
  throw new ValidationError(
    `Concurrency conflict: expected version ${expectedVersion}, got ${currentVersion}`,
  );
}
```

**特徴:**

- HTTPステータス: 400 Bad Request
- ユーザーに表示可能なエラーメッセージ
- リトライ可能な場合がある（例: Concurrency conflict）

#### DatabaseError

**用途**: データベース操作の失敗、インフラストラクチャレベルのエラー

**例:**

- 接続エラー
- クエリタイムアウト
- 制約違反（外部キー、NOT NULL等）

```typescript
return wrapDrizzle(db.select().from(table).where(condition)).map(
  (rows) => rows[0] ?? null,
);
```

**特徴:**

- HTTPステータス: 500 Internal Server Error
- 詳細なエラーメッセージは隠蔽（セキュリティのため）
- ログに記録して調査が必要

### Error Handling Pattern

```typescript
// Event Storeのappendメソッドの例
return ResultAsync.fromPromise(
  db.transaction(async (tx) => {
    // ... transaction logic
    if (currentVersion !== expectedVersion) {
      throw new ValidationError("Concurrency conflict");
    }
    // ... continue
  }),
  (error) => {
    // エラーを分類して適切な型に変換
    if (error instanceof ValidationError) return error;
    if (error instanceof DatabaseError) return error;
    return new DatabaseError("Failed to append events", error);
  },
);
```

### Best Practices

1. **予期しないエラーは詳細を隠す**: 固定メッセージを使用してセキュリティリスクを回避
2. **エラーの分類は早期に**: 発生源に近い場所で適切な型に変換
3. **Result型で合成**: `.andThen()`や`.map()`でエラーハンドリングをチェーンできる

## Workflow Pattern

すべてのワークフロー（ユースケース）は、関数型プログラミングスタイルで実装されています。

### Basic Pattern

```typescript
export const createUpdateTaskWorkflow = (
  executeCommand: TaskExecuteCommand,
): UpdateTaskWorkflow => {
  return withSpanAsync(
    "updateTask",
    (command) => {
      return ok(command).asyncAndThen(executeUpdateTask(executeCommand));
    },
    {
      spanAttrs: (args) => ({
        "task.session.id": args[0].input.taskSessionId,
      }),
    },
  );
};
```

### Pattern Components

#### 1. High-Order Functions

ワークフローは高階関数として定義され、依存性を明示的に注入します:

```typescript
const executeUpdateTask =
  (executeCommand: TaskExecuteCommand) =>
  (command: Parameters<UpdateTaskWorkflow>[0]) => {
    return executeCommand({
      streamId: command.input.taskSessionId,
      workspace: command.workspace,
      user: command.user,
      command: {
        type: "AddProgress",
        payload: { summary: command.input.summary },
      },
    });
  };
```

**利点:**

- テスト時にモックを注入しやすい
- 依存関係が明示的
- 関数の再利用性が高い

#### 2. Result Pipeline

`ok(value).asyncAndThen(fn)` パターンで、エラーハンドリングを含むパイプラインを構築:

```typescript
return ok(command)
  .asyncAndThen(validateInput)
  .asyncAndThen(checkPermissions)
  .asyncAndThen(executeCommand)
  .map(formatResponse);
```

**利点:**

- エラーが発生した時点でパイプラインが停止
- 各ステップの型が保証される
- 読みやすい線形フロー

#### 3. Observability

`withSpanAsync`でOpenTelemetryのトレーシングを自動化:

```typescript
withSpanAsync(
  "operationName",
  (input) => {
    /* logic */
  },
  {
    spanAttrs: (args) => ({
      "attribute.name": args[0].someValue,
    }),
  },
);
```

### Complete Example

```typescript
type StartTaskInput = {
  workspace: Workspace;
  user: User;
  input: {
    issue: Issue;
    initialSummary: string;
  };
};

const executeStartTask =
  (executeCommand: TaskExecuteCommand) => (command: StartTaskInput) => {
    const streamId = `task-${uuidv7()}`;

    return executeCommand({
      streamId,
      workspace: command.workspace,
      user: command.user,
      command: {
        type: "StartTask",
        payload: {
          issue: command.input.issue,
          initialSummary: command.input.initialSummary,
        },
      },
    }).map((result) => ({
      taskSessionId: streamId,
      status: result.state.status,
      // ... other fields
    }));
  };

export const createStartTaskWorkflow = (
  executeCommand: TaskExecuteCommand,
): StartTaskWorkflow => {
  return withSpanAsync(
    "startTask",
    (command) => {
      return ok(command).asyncAndThen(executeStartTask(executeCommand));
    },
    {
      spanAttrs: (args) => ({
        "issue.provider": args[0].input.issue.provider,
      }),
    },
  );
};
```

## Repository Pattern

### Interface-Implementation Separation

リポジトリはインターフェースと実装を分離し、依存性注入を可能にします。

#### Interface Definition

```typescript
// repos/subscriptions/interface.ts
export type SubscriptionRepository = {
  getActiveSubscription: (
    userId: string,
  ) => ResultAsync<schema.Subscription | null, DatabaseError>;

  countUserTaskSessions: (userId: string) => ResultAsync<number, DatabaseError>;
};
```

#### Implementation

```typescript
// repos/subscriptions/index.ts
const getActiveSubscription = (db: Database) => (userId: string) => {
  return wrapDrizzle(
    db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active"),
        ),
      )
      .limit(1),
  ).map((rows) => rows[0] ?? null);
};

export const createSubscriptionRepository = (db: Database) => ({
  getActiveSubscription: getActiveSubscription(db),
  countUserTaskSessions: countUserTaskSessions(db),
});
```

### Best Practices

1. **Result型を返す**: すべてのリポジトリメソッドは`ResultAsync<T, DatabaseError>`を返す
2. **wrapDrizzleを使用**: データベースクエリは`wrapDrizzle`でラップして一貫したエラーハンドリング
3. **純粋関数**: リポジトリメソッドは副作用を持たない（データベース操作以外）
4. **並列クエリ**: `ResultAsync.combine`で複数のクエリを並列実行

#### Parallel Queries Example

```typescript
return ResultAsync.combine([
  subscriptionRepo.getActiveSubscription(userId),
  subscriptionRepo.countUserTaskSessions(userId),
]).andThen(([activeSubscription, sessionCount]) => {
  // Both queries completed, process results
});
```

## Summary

- **Event Sourcing Pipeline**: Typestate patternで型安全なステージ遷移
- **Error Handling**: ValidationErrorとDatabaseErrorを使い分け、Result型で合成
- **Workflow Pattern**: `ok(command).asyncAndThen(fn)`で読みやすいパイプライン
- **Repository Pattern**: インターフェース分離、Result型、wrapDrizzleで一貫性

これらのパターンにより、型安全で保守しやすく、テスト可能なコードベースを実現しています。
