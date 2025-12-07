import type { HonoEnv } from "@/types";
import type { StartedTaskSession } from "@/models/taskSessions";
import type { InternalServerError } from "@/errors";
import type { ResultAsync } from "neverthrow";

/**
 * タスクセッション関連のユースケースの入出力型定義
 */

// ============================================
// Common Types
// ============================================

export type SlackNotificationResult = {
  delivered: boolean;
  reason?: string;
};

// ============================================
// Start Task - Command/Event Pattern
// ============================================

export interface CreateTaskSessionInput {
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  issue: {
    provider: "github" | "manual";
    id?: string;
    title: string;
  };
  initialSummary: string;
}

export interface CreateTaskSessionCommand {
  kind: "CreateTaskSessionCommand";
  input: CreateTaskSessionInput;
}

export interface CreateTaskSessionCreated {
  kind: "CreateTaskSessionCreated";
  input: CreateTaskSessionInput;
  request: StartedTaskSession;
}

export interface CreateTaskSessionCompleted {
  kind: "CreateTaskSessionCompleted";
  result:
    | {
        success: true;
        input: CreateTaskSessionInput;
        session: StartedTaskSession;
        slackNotification: SlackNotificationResult;
      }
    | {
        success: false;
        input: CreateTaskSessionInput;
        error: string;
      };
}

export type CreateTaskSessionWorkflow = (
  command: CreateTaskSessionCommand,
) => ResultAsync<CreateTaskSessionCompleted, InternalServerError>;

// ============================================
// Update Task - Command/Event Pattern
// ============================================

export interface UpdateTaskSessionInput {
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  taskSessionId: string;
  summary: string;
  rawContext?: Record<string, unknown>;
}

export interface UpdateTaskSessionCommand {
  kind: "UpdateTaskSessionCommand";
  input: UpdateTaskSessionInput;
}

export interface UpdateTaskSessionCompleted {
  kind: "UpdateTaskSessionCompleted";
  result: {
    input: UpdateTaskSessionInput;
    taskSessionId: string;
    updateId: string;
    status: "in_progress" | "blocked" | "paused" | "completed" | "cancelled";
    summary: string;
    slackNotification: SlackNotificationResult;
  };
}

export type UpdateTaskSessionWorkflow = (
  command: UpdateTaskSessionCommand,
) => ResultAsync<UpdateTaskSessionCompleted, InternalServerError>;

// ============================================
// Complete Task - Command/Event Pattern
// ============================================

export interface CompleteTaskSessionInput {
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  taskSessionId: string;
  summary: string;
}

export interface CompleteTaskSessionCommand {
  kind: "CompleteTaskSessionCommand";
  input: CompleteTaskSessionInput;
}

export interface CompleteTaskSessionCompleted {
  kind: "CompleteTaskSessionCompleted";
  result: {
    input: CompleteTaskSessionInput;
    taskSessionId: string;
    completionId: string;
    status: "completed";
    slackNotification: SlackNotificationResult;
    unresolvedBlocks: Array<{
      blockReportId: string;
      reason: string | null;
      createdAt: Date;
    }>;
  };
}

export type CompleteTaskSessionWorkflow = (
  command: CompleteTaskSessionCommand,
) => ResultAsync<CompleteTaskSessionCompleted, InternalServerError>;

// ============================================
// Report Blocked - Command/Event Pattern
// ============================================

export interface ReportBlockedInput {
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  taskSessionId: string;
  reason: string;
  rawContext?: Record<string, unknown>;
}

export interface ReportBlockedCommand {
  kind: "ReportBlockedCommand";
  input: ReportBlockedInput;
}

export interface ReportBlockedCompleted {
  kind: "ReportBlockedCompleted";
  result: {
    input: ReportBlockedInput;
    taskSessionId: string;
    blockReportId: string;
    status: "blocked";
    reason: string;
    slackNotification: SlackNotificationResult;
  };
}

export type ReportBlockedWorkflow = (
  command: ReportBlockedCommand,
) => ResultAsync<ReportBlockedCompleted, InternalServerError>;

// ============================================
// Pause Task - Command/Event Pattern
// ============================================

export interface PauseTaskInput {
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  taskSessionId: string;
  reason: string;
  rawContext?: Record<string, unknown>;
}

export interface PauseTaskCommand {
  kind: "PauseTaskCommand";
  input: PauseTaskInput;
}

export interface PauseTaskCompleted {
  kind: "PauseTaskCompleted";
  result: {
    input: PauseTaskInput;
    taskSessionId: string;
    pauseReportId: string;
    status: "paused";
    pausedAt: Date;
    slackNotification: SlackNotificationResult;
  };
}

export type PauseTaskWorkflow = (
  command: PauseTaskCommand,
) => ResultAsync<PauseTaskCompleted, InternalServerError>;

// ============================================
// Resume Task - Command/Event Pattern
// ============================================

export interface ResumeTaskInput {
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  taskSessionId: string;
  summary: string;
  rawContext?: Record<string, unknown>;
}

export interface ResumeTaskCommand {
  kind: "ResumeTaskCommand";
  input: ResumeTaskInput;
}

export interface ResumeTaskCompleted {
  kind: "ResumeTaskCompleted";
  result: {
    input: ResumeTaskInput;
    taskSessionId: string;
    status: "in_progress";
    resumedAt: Date;
    slackNotification: SlackNotificationResult;
  };
}

export type ResumeTaskWorkflow = (
  command: ResumeTaskCommand,
) => ResultAsync<ResumeTaskCompleted, InternalServerError>;

// ============================================
// Resolve Blocked - Command/Event Pattern
// ============================================

export interface ResolveBlockedInput {
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  taskSessionId: string;
  blockReportId: string;
}

export interface ResolveBlockedCommand {
  kind: "ResolveBlockedCommand";
  input: ResolveBlockedInput;
}

export interface ResolveBlockedCompleted {
  kind: "ResolveBlockedCompleted";
  result: {
    input: ResolveBlockedInput;
    taskSessionId: string;
    blockReportId: string;
    status: "in_progress" | "blocked" | "paused" | "completed" | "cancelled";
    resolvedAt: Date;
    slackNotification: SlackNotificationResult;
  };
}

export type ResolveBlockedWorkflow = (
  command: ResolveBlockedCommand,
) => ResultAsync<ResolveBlockedCompleted, InternalServerError>;

// ============================================
// List Tasks - Command/Event Pattern
// ============================================

export interface ListTaskSessionsInput {
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  status?: "in_progress" | "blocked" | "paused" | "completed" | "cancelled";
  limit?: number;
}

export interface ListTaskSessionsCommand {
  kind: "ListTaskSessionsCommand";
  input: ListTaskSessionsInput;
}

export type TaskSessionSummary = {
  taskSessionId: string;
  issueProvider: "github" | "manual";
  issueId: string | null;
  issueTitle: string;
  status: "in_progress" | "blocked" | "paused" | "completed" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
};

export interface ListTaskSessionsCompleted {
  kind: "ListTaskSessionsCompleted";
  result: {
    input: ListTaskSessionsInput;
    tasks: TaskSessionSummary[];
  };
}

export type ListTaskSessionsWorkflow = (
  command: ListTaskSessionsCommand,
) => ResultAsync<ListTaskSessionsCompleted, InternalServerError>;
