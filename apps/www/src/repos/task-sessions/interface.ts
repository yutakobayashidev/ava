import type * as schema from "@ava/database/schema";

type IssueProvider = (typeof schema.issueProviderEnum.enumValues)[number];

export type TaskStatus = (typeof schema.taskStatusEnum.enumValues)[number];

export type CreateTaskSessionRequest = {
  userId: string;
  workspaceId: string;
  issueProvider: IssueProvider;
  issueId?: string | null;
  issueTitle: string;
  initialSummary: string;
};

export type AddTaskUpdateRequest = {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
  summary: string;
  rawContext?: Record<string, unknown>;
};

export type ReportBlockRequest = {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
  reason: string;
  rawContext?: Record<string, unknown>;
};

export type CompleteTaskRequest = {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
  summary: string;
};

export type ResolveBlockRequest = {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
  blockReportId: string;
};

export type PauseTaskRequest = {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
  reason: string;
  rawContext?: Record<string, unknown>;
};

export type ResumeTaskRequest = {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
  summary: string;
  rawContext?: Record<string, unknown>;
};

export type ListOptions = {
  limit?: number;
};

export type ListTaskSessionsRequest = {
  userId: string;
  workspaceId: string;
  status?: TaskStatus;
  limit?: number;
  updatedAfter?: Date;
  updatedBefore?: Date;
};

// Repository functions - curried with db
export type TaskRepository = {
  createTaskSession: (
    params: CreateTaskSessionRequest,
  ) => Promise<schema.TaskSession>;
  findTaskSessionById: (
    taskSessionId: string,
    workspaceId: string,
    userId: string,
  ) => Promise<schema.TaskSession | null>;
  addTaskUpdate: (params: AddTaskUpdateRequest) => Promise<{
    session: schema.TaskSession | null;
    updateEvent: schema.TaskEvent | null;
  }>;
  reportBlock: (params: ReportBlockRequest) => Promise<{
    session: schema.TaskSession | null;
    blockReport: schema.TaskEvent | null;
  }>;
  pauseTask: (params: PauseTaskRequest) => Promise<{
    session: schema.TaskSession | null;
    pauseReport: schema.TaskEvent | null;
  }>;
  resumeTask: (params: ResumeTaskRequest) => Promise<{
    session: schema.TaskSession | null;
  }>;
  completeTask: (params: CompleteTaskRequest) => Promise<{
    session: schema.TaskSession | null;
    completedEvent: schema.TaskEvent | null;
    unresolvedBlocks: schema.TaskEvent[];
  }>;
  listBlockReports: (
    taskSessionId: string,
    options?: ListOptions,
  ) => Promise<schema.TaskEvent[]>;
  getUnresolvedBlockReports: (
    taskSessionId: string,
  ) => Promise<schema.TaskEvent[]>;
  getBulkUnresolvedBlockReports: (
    taskSessionIds: string[],
  ) => Promise<Map<string, schema.TaskEvent[]>>;
  resolveBlockReport: (params: ResolveBlockRequest) => Promise<{
    session: schema.TaskSession | null;
    blockReport: schema.TaskEvent | null;
  }>;
  listTaskSessions: (
    params: ListTaskSessionsRequest,
  ) => Promise<schema.TaskSession[]>;
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
