import type * as schema from "@ava/database/schema";
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
}) => Promise<schema.TaskSession>;

export type AddTaskUpdate = (params: {
  request: UpdatedTaskSession;
}) => Promise<{
  session: schema.TaskSession | null;
  updateEvent: schema.TaskEvent | null;
}>;

export type ReportBlock = (params: { request: BlockedTaskSession }) => Promise<{
  session: schema.TaskSession | null;
  blockReport: schema.TaskEvent | null;
}>;

export type PauseTask = (params: { request: PausedTaskSession }) => Promise<{
  session: schema.TaskSession | null;
  pauseReport: schema.TaskEvent | null;
}>;

export type ResumeTask = (params: { request: ResumedTaskSession }) => Promise<{
  session: schema.TaskSession | null;
}>;

export type CompleteTask = (params: {
  request: CompletedTaskSession;
}) => Promise<{
  session: schema.TaskSession | null;
  completedEvent: schema.TaskEvent | null;
  unresolvedBlocks: schema.TaskEvent[];
}>;

export type ResolveBlockReport = (params: {
  request: ResolvedBlockTaskSession;
}) => Promise<{
  session: schema.TaskSession | null;
  blockReport: schema.TaskEvent | null;
}>;

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
  ) => Promise<schema.TaskSession | null>;
  listTaskSessions: (params: {
    userId: string;
    workspaceId: string;
    status?: TaskStatus;
    limit?: number;
    updatedAfter?: Date;
    updatedBefore?: Date;
  }) => Promise<schema.TaskSession[]>;
  updateSlackThread: (params: {
    taskSessionId: string;
    workspaceId: string;
    userId: string;
    threadTs: string;
    channel: string;
  }) => Promise<schema.TaskSession | null>;
  listEvents: (params: {
    taskSessionId: string;
    eventType?: (typeof schema.taskEventTypeEnum.enumValues)[number];
    limit?: number;
  }) => Promise<schema.TaskEvent[]>;
  getUnresolvedBlockReports: (
    taskSessionId: string,
  ) => Promise<schema.TaskEvent[]>;
  getBulkUnresolvedBlockReports: (
    taskSessionIds: string[],
  ) => Promise<Map<string, schema.TaskEvent[]>>;
  getBulkLatestEvents: (params: {
    taskSessionIds: string[];
    eventType: (typeof schema.taskEventTypeEnum.enumValues)[number];
    limit?: number;
  }) => Promise<Map<string, schema.TaskEvent[]>>;
  getLatestEvent: (params: {
    taskSessionId: string;
    eventType: (typeof schema.taskEventTypeEnum.enumValues)[number];
  }) => Promise<schema.TaskEvent | null>;
  getLatestEventByTypes: (
    taskSessionId: string,
    eventTypes: (typeof schema.taskEventTypeEnum.enumValues)[number][],
  ) => Promise<schema.TaskEvent | null>;
  getTodayCompletedTasks: (params: {
    userId: string;
    workspaceId: string;
    dateRange: { from: Date; to: Date };
  }) => Promise<
    Array<
      schema.TaskSession & {
        completedAt: Date;
        completionSummary: string | null;
      }
    >
  >;
};
