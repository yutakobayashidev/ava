import type * as schema from "@ava/database/schema";
import type { ResultAsync } from "neverthrow";
import type { DatabaseError } from "@/lib/database";
import type {
  StartedTaskSession,
  UpdatedTaskSession,
  BlockedTaskSession,
  PausedTaskSession,
  ResumedTaskSession,
  CompletedTaskSession,
  ResolvedBlockTaskSession,
} from "@/models/taskSessions";

export type TaskStatus = (typeof schema.taskStatusEnum.enumValues)[number];

// CRUD操作の個別型定義
export type CreateTaskSession = (params: {
  request: StartedTaskSession;
}) => ResultAsync<schema.TaskSession, DatabaseError>;

export type AddTaskUpdate = (params: {
  request: UpdatedTaskSession;
}) => ResultAsync<
  {
    session: schema.TaskSession | null;
    updateEvent: schema.TaskEvent | null;
  },
  DatabaseError
>;

export type ReportBlock = (params: {
  request: BlockedTaskSession;
}) => ResultAsync<
  {
    session: schema.TaskSession | null;
    blockReport: schema.TaskEvent | null;
  },
  DatabaseError
>;

export type PauseTask = (params: { request: PausedTaskSession }) => ResultAsync<
  {
    session: schema.TaskSession | null;
    pauseReport: schema.TaskEvent | null;
  },
  DatabaseError
>;

export type ResumeTask = (params: {
  request: ResumedTaskSession;
}) => ResultAsync<
  {
    session: schema.TaskSession | null;
  },
  DatabaseError
>;

export type CompleteTask = (params: {
  request: CompletedTaskSession;
}) => ResultAsync<
  {
    session: schema.TaskSession | null;
    completedEvent: schema.TaskEvent | null;
    unresolvedBlocks: schema.TaskEvent[];
  },
  DatabaseError
>;

export type ResolveBlockReport = (params: {
  request: ResolvedBlockTaskSession;
}) => ResultAsync<
  {
    session: schema.TaskSession | null;
    blockReport: schema.TaskEvent | null;
  },
  DatabaseError
>;

// Repository functions - モデルベース
export type TaskRepository = {
  // CRUD操作（ドメインモデルを受け取る）
  createTaskSession: CreateTaskSession;
  addTaskUpdate: AddTaskUpdate;
  reportBlock: ReportBlock;
  pauseTask: PauseTask;
  resumeTask: ResumeTask;
  completeTask: CompleteTask;
  resolveBlockReport: ResolveBlockReport;

  // ユーティリティ関数
  findTaskSessionById: (
    taskSessionId: string,
    workspaceId: string,
    userId: string,
  ) => ResultAsync<schema.TaskSession | null, DatabaseError>;
  listTaskSessions: (params: {
    userId: string;
    workspaceId: string;
    status?: TaskStatus;
    limit?: number;
    updatedAfter?: Date;
    updatedBefore?: Date;
  }) => ResultAsync<schema.TaskSession[], DatabaseError>;
  updateSlackThread: (params: {
    taskSessionId: string;
    workspaceId: string;
    userId: string;
    threadTs: string;
    channel: string;
  }) => ResultAsync<schema.TaskSession | null, DatabaseError>;
  listEvents: (params: {
    taskSessionId: string;
    eventType?: (typeof schema.taskEventTypeEnum.enumValues)[number];
    limit?: number;
  }) => ResultAsync<schema.TaskEvent[], DatabaseError>;
  getUnresolvedBlockReports: (
    taskSessionId: string,
  ) => ResultAsync<schema.TaskEvent[], DatabaseError>;
  getBulkUnresolvedBlockReports: (
    taskSessionIds: string[],
  ) => ResultAsync<Map<string, schema.TaskEvent[]>, DatabaseError>;
  getBulkLatestEvents: (params: {
    taskSessionIds: string[];
    eventType: (typeof schema.taskEventTypeEnum.enumValues)[number];
    limit?: number;
  }) => ResultAsync<Map<string, schema.TaskEvent[]>, DatabaseError>;
  getLatestEvent: (params: {
    taskSessionId: string;
    eventType: (typeof schema.taskEventTypeEnum.enumValues)[number];
  }) => ResultAsync<schema.TaskEvent | null, DatabaseError>;
  getLatestEventByTypes: (
    taskSessionId: string,
    eventTypes: (typeof schema.taskEventTypeEnum.enumValues)[number][],
  ) => ResultAsync<schema.TaskEvent | null, DatabaseError>;
  getTodayCompletedTasks: (params: {
    userId: string;
    workspaceId: string;
    dateRange: { from: Date; to: Date };
  }) => ResultAsync<
    Array<
      schema.TaskSession & {
        completedAt: Date;
        completionSummary: string | null;
      }
    >,
    DatabaseError
  >;
};
