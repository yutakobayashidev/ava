/**
 * Task Session Domain Models
 * 状態遷移をドメインモデルで表現
 */

import type * as schema from "@ava/database/schema";
import { uuidv7 } from "uuidv7";
import { ok, type Result } from "neverthrow";

type IssueProvider = (typeof schema.issueProviderEnum.enumValues)[number];

// 作成可能なタスク（started状態）
export type StartedTaskSession = {
  id: string;
  userId: string;
  workspaceId: string;
  issueProvider: IssueProvider;
  issueId?: string | null;
  issueTitle: string;
  initialSummary: string;
};

export const createStartedTaskSession = (params: {
  userId: string;
  workspaceId: string;
  issueProvider: IssueProvider;
  issueId?: string | null;
  issueTitle: string;
  initialSummary: string;
}): Result<StartedTaskSession, never> => {
  return ok({
    id: uuidv7(),
    userId: params.userId,
    workspaceId: params.workspaceId,
    issueProvider: params.issueProvider,
    issueId: params.issueId,
    issueTitle: params.issueTitle,
    initialSummary: params.initialSummary,
  });
};

// 更新可能なタスク（blocked/paused → in_progress）
export type UpdatedTaskSession = {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
  summary: string;
  rawContext?: Record<string, unknown>;
  updatedAt: Date;
};

export const createUpdatedTaskSession = (params: {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
  summary: string;
  rawContext?: Record<string, unknown>;
}): UpdatedTaskSession => {
  return {
    ...params,
    updatedAt: new Date(),
  };
};

// ブロック報告されたタスク
export type BlockedTaskSession = {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
  reason: string;
  rawContext?: Record<string, unknown>;
  updatedAt: Date;
};

export const createBlockedTaskSession = (params: {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
  reason: string;
  rawContext?: Record<string, unknown>;
}): BlockedTaskSession => {
  return {
    ...params,
    updatedAt: new Date(),
  };
};

// 一時停止されたタスク
export type PausedTaskSession = {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
  reason: string;
  rawContext?: Record<string, unknown>;
  updatedAt: Date;
};

export const createPausedTaskSession = (params: {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
  reason: string;
  rawContext?: Record<string, unknown>;
}): PausedTaskSession => {
  return {
    ...params,
    updatedAt: new Date(),
  };
};

// 再開されたタスク
export type ResumedTaskSession = {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
  summary: string;
  rawContext?: Record<string, unknown>;
  updatedAt: Date;
};

export const createResumedTaskSession = (params: {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
  summary: string;
  rawContext?: Record<string, unknown>;
}): ResumedTaskSession => {
  return {
    ...params,
    updatedAt: new Date(),
  };
};

// 完了したタスク
export type CompletedTaskSession = {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
  summary: string;
  updatedAt: Date;
};

export const createCompletedTaskSession = (params: {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
  summary: string;
}): CompletedTaskSession => {
  return {
    ...params,
    updatedAt: new Date(),
  };
};

// ブロック解決
export type ResolvedBlockTaskSession = {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
  blockReportId: string;
  updatedAt: Date;
};

export const createResolvedBlockTaskSession = (params: {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
  blockReportId: string;
}): ResolvedBlockTaskSession => {
  return {
    ...params,
    updatedAt: new Date(),
  };
};

export type UpdatableTaskSession =
  | UpdatedTaskSession
  | BlockedTaskSession
  | PausedTaskSession
  | ResumedTaskSession
  | CompletedTaskSession
  | ResolvedBlockTaskSession;

// ============================================
// Query Request Types
// ============================================

export type FindTaskSessionByIdRequest = {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
};

export const createFindTaskSessionByIdRequest = (params: {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
}): FindTaskSessionByIdRequest => params;

export type ListTaskSessionsRequest = {
  userId: string;
  workspaceId: string;
  status?: (typeof schema.taskStatusEnum.enumValues)[number];
  limit?: number;
  updatedAfter?: Date;
  updatedBefore?: Date;
};

export const createListTaskSessionsRequest = (params: {
  userId: string;
  workspaceId: string;
  status?: (typeof schema.taskStatusEnum.enumValues)[number];
  limit?: number;
  updatedAfter?: Date;
  updatedBefore?: Date;
}): ListTaskSessionsRequest => params;

export type UpdateSlackThreadRequest = {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
  threadTs: string;
  channel: string;
};

export const createUpdateSlackThreadRequest = (params: {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
  threadTs: string;
  channel: string;
}): UpdateSlackThreadRequest => params;

export type ListEventsRequest = {
  taskSessionId: string;
  eventType?: (typeof schema.taskEventTypeEnum.enumValues)[number];
  limit?: number;
};

export const createListEventsRequest = (params: {
  taskSessionId: string;
  eventType?: (typeof schema.taskEventTypeEnum.enumValues)[number];
  limit?: number;
}): ListEventsRequest => params;

export type GetUnresolvedBlockReportsRequest = {
  taskSessionId: string;
};

export const createGetUnresolvedBlockReportsRequest = (params: {
  taskSessionId: string;
}): GetUnresolvedBlockReportsRequest => params;

export type GetBulkUnresolvedBlockReportsRequest = {
  taskSessionIds: string[];
};

export const createGetBulkUnresolvedBlockReportsRequest = (params: {
  taskSessionIds: string[];
}): GetBulkUnresolvedBlockReportsRequest => params;

export type GetBulkLatestEventsRequest = {
  taskSessionIds: string[];
  eventType: (typeof schema.taskEventTypeEnum.enumValues)[number];
  limit?: number;
};

export const createGetBulkLatestEventsRequest = (params: {
  taskSessionIds: string[];
  eventType: (typeof schema.taskEventTypeEnum.enumValues)[number];
  limit?: number;
}): GetBulkLatestEventsRequest => params;

export type GetLatestEventRequest = {
  taskSessionId: string;
  eventType: (typeof schema.taskEventTypeEnum.enumValues)[number];
};

export const createGetLatestEventRequest = (params: {
  taskSessionId: string;
  eventType: (typeof schema.taskEventTypeEnum.enumValues)[number];
}): GetLatestEventRequest => params;

export type GetLatestEventByTypesRequest = {
  taskSessionId: string;
  eventTypes: (typeof schema.taskEventTypeEnum.enumValues)[number][];
};

export const createGetLatestEventByTypesRequest = (params: {
  taskSessionId: string;
  eventTypes: (typeof schema.taskEventTypeEnum.enumValues)[number][];
}): GetLatestEventByTypesRequest => params;

export type GetTodayCompletedTasksRequest = {
  userId: string;
  workspaceId: string;
  dateRange: {
    from: Date;
    to: Date;
  };
};

export const createGetTodayCompletedTasksRequest = (params: {
  userId: string;
  workspaceId: string;
  dateRange: {
    from: Date;
    to: Date;
  };
}): GetTodayCompletedTasksRequest => params;
