import type * as schema from "@ava/database/schema";

export type TaskStatus = (typeof schema.taskStatusEnum.enumValues)[number];

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

// Query-focused repository
export type TaskQueryRepository = {
  findTaskSessionById: (
    taskSessionId: string,
    workspaceId: string,
    userId: string,
  ) => Promise<schema.TaskSession | null>;
  getUnresolvedBlockReports: (
    taskSessionId: string,
  ) => Promise<schema.TaskEvent[]>;
  getBulkUnresolvedBlockReports: (
    taskSessionIds: string[],
  ) => Promise<Map<string, schema.TaskEvent[]>>;
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
