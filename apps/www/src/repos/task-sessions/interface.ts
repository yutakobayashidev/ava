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
  FindTaskSessionByIdRequest,
  ListTaskSessionsRequest,
  UpdateSlackThreadRequest,
  ListEventsRequest,
  GetUnresolvedBlockReportsRequest,
  GetBulkUnresolvedBlockReportsRequest,
  GetBulkLatestEventsRequest,
  GetLatestEventRequest,
  GetLatestEventByTypesRequest,
  GetTodayCompletedTasksRequest,
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

// Query operation type definitions
export type FindTaskSessionById = (params: {
  request: FindTaskSessionByIdRequest;
}) => ResultAsync<schema.TaskSession | null, DatabaseError>;

export type ListTaskSessions = (params: {
  request: ListTaskSessionsRequest;
}) => ResultAsync<schema.TaskSession[], DatabaseError>;

export type UpdateSlackThread = (params: {
  request: UpdateSlackThreadRequest;
}) => ResultAsync<schema.TaskSession | null, DatabaseError>;

export type ListEvents = (params: {
  request: ListEventsRequest;
}) => ResultAsync<schema.TaskEvent[], DatabaseError>;

export type GetUnresolvedBlockReports = (params: {
  request: GetUnresolvedBlockReportsRequest;
}) => ResultAsync<schema.TaskEvent[], DatabaseError>;

export type GetBulkUnresolvedBlockReports = (params: {
  request: GetBulkUnresolvedBlockReportsRequest;
}) => ResultAsync<Map<string, schema.TaskEvent[]>, DatabaseError>;

export type GetBulkLatestEvents = (params: {
  request: GetBulkLatestEventsRequest;
}) => ResultAsync<Map<string, schema.TaskEvent[]>, DatabaseError>;

export type GetLatestEvent = (params: {
  request: GetLatestEventRequest;
}) => ResultAsync<schema.TaskEvent | null, DatabaseError>;

export type GetLatestEventByTypes = (params: {
  request: GetLatestEventByTypesRequest;
}) => ResultAsync<schema.TaskEvent | null, DatabaseError>;

export type GetTodayCompletedTasks = (params: {
  request: GetTodayCompletedTasksRequest;
}) => ResultAsync<
  Array<
    schema.TaskSession & {
      completedAt: Date;
      completionSummary: string | null;
    }
  >,
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

  // Query operations（すべて { request } パターンを使用）
  findTaskSessionById: FindTaskSessionById;
  listTaskSessions: ListTaskSessions;
  updateSlackThread: UpdateSlackThread;
  listEvents: ListEvents;
  getUnresolvedBlockReports: GetUnresolvedBlockReports;
  getBulkUnresolvedBlockReports: GetBulkUnresolvedBlockReports;
  getBulkLatestEvents: GetBulkLatestEvents;
  getLatestEvent: GetLatestEvent;
  getLatestEventByTypes: GetLatestEventByTypes;
  getTodayCompletedTasks: GetTodayCompletedTasks;
};
