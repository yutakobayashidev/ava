/**
 * Task Session Domain Models
 * 状態遷移をドメインモデルで表現
 */

import type * as schema from "@ava/database/schema";
import { uuidv7 } from "uuidv7";

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
}): StartedTaskSession => {
  return {
    id: uuidv7(),
    userId: params.userId,
    workspaceId: params.workspaceId,
    issueProvider: params.issueProvider,
    issueId: params.issueId,
    issueTitle: params.issueTitle,
    initialSummary: params.initialSummary,
  };
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
