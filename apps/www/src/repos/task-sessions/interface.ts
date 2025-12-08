import type { DatabaseError } from "@/lib/db";
import type { ResultAsync } from "neverthrow";
import type * as schema from "@ava/database/schema";

export type TaskStatus = (typeof schema.taskStatusEnum.enumValues)[number];

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
  ) => ResultAsync<schema.TaskSession | null, DatabaseError>;
  getUnresolvedBlockReports: (
    taskSessionId: string,
  ) => ResultAsync<schema.TaskEvent[], DatabaseError>;
  getBulkUnresolvedBlockReports: (
    taskSessionIds: string[],
  ) => ResultAsync<Map<string, schema.TaskEvent[]>, DatabaseError>;
  listTaskSessions: (
    params: ListTaskSessionsRequest,
  ) => ResultAsync<schema.TaskSession[], DatabaseError>;
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
    includeTechnicalEvents?: boolean;
  }) => ResultAsync<schema.TaskEvent[], DatabaseError>;
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
