import type { TaskStatusFilter } from "@/objects/task/task-status";
import { HonoEnv } from "@/types";

/**
 * 共通型
 */

type BaseCommand<Params> = {
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  params: Params;
};

type Result<T> = { success: true; data: T } | { success: false; error: string };

/**
 * Start Task
 */

type StartTaskParams = {
  issue: {
    provider: "github" | "manual";
    id?: string;
    title: string;
  };
  initialSummary: string;
};

export type StartTaskCommand = BaseCommand<StartTaskParams>;

type StartTaskSuccess = {
  taskSessionId: string;
  status: string;
  issuedAt: Date;
};

export type StartTaskOutput = Result<StartTaskSuccess>;

/**
 * Update Task
 */

type UpdateTaskParams = {
  taskSessionId: string;
  summary: string;
};

export type UpdateTaskCommand = BaseCommand<UpdateTaskParams>;

type UpdateTaskSuccess = {
  taskSessionId: string;
  updateId: string;
  status: string;
  summary: string | null;
};

export type UpdateTaskOutput = Result<UpdateTaskSuccess>;

/**
 * Complete Task
 */

type CompleteTaskParams = {
  taskSessionId: string;
  summary: string;
};

export type CompleteTaskCommand = BaseCommand<CompleteTaskParams>;

type CompleteTaskSuccess = {
  taskSessionId: string;
  completionId: string;
  status: string;
  unresolvedBlocks?: Array<{
    blockReportId: string;
    reason: string | null;
    createdAt: Date;
  }>;
};

export type CompleteTaskOutput = Result<CompleteTaskSuccess>;

/**
 * Cancel Task
 */

type CancelTaskParams = {
  taskSessionId: string;
  reason?: string;
};

export type CancelTaskCommand = BaseCommand<CancelTaskParams>;

type CancelTaskSuccess = {
  taskSessionId: string;
  cancellationId: string;
  status: string;
  cancelledAt: Date;
};

export type CancelTaskOutput = Result<CancelTaskSuccess>;

/**
 * Report Blocked
 */

type ReportBlockedParams = {
  taskSessionId: string;
  reason: string;
};

export type ReportBlockedCommand = BaseCommand<ReportBlockedParams>;

type ReportBlockedSuccess = {
  taskSessionId: string;
  blockReportId: string;
  status: string;
  reason: string | null;
};

export type ReportBlockedOutput = Result<ReportBlockedSuccess>;

/**
 * Pause Task
 */

type PauseTaskParams = {
  taskSessionId: string;
  reason: string;
};

export type PauseTaskCommand = BaseCommand<PauseTaskParams>;

type PauseTaskSuccess = {
  taskSessionId: string;
  pauseReportId: string;
  status: string;
  pausedAt: Date;
};

export type PauseTaskOutput = Result<PauseTaskSuccess>;

/**
 * Resume Task
 */

type ResumeTaskParams = {
  taskSessionId: string;
  summary: string;
};

export type ResumeTaskCommand = BaseCommand<ResumeTaskParams>;

type ResumeTaskSuccess = {
  taskSessionId: string;
  status: string;
  resumedAt: Date;
};

export type ResumeTaskOutput = Result<ResumeTaskSuccess>;

/**
 * Resolve Blocked
 */

type ResolveBlockedParams = {
  taskSessionId: string;
  blockReportId: string;
};

export type ResolveBlockedCommand = BaseCommand<ResolveBlockedParams>;

type ResolveBlockedSuccess = {
  taskSessionId: string;
  blockReportId: string;
  status: string;
  resolvedAt: Date;
};

export type ResolveBlockedOutput = Result<ResolveBlockedSuccess>;

/**
 * List Tasks
 */

type ListTasksParams = {
  status?: TaskStatusFilter;
  limit?: number;
};

export type ListTasksCommand = BaseCommand<ListTasksParams>;

type TaskSummary = {
  taskSessionId: string;
  issueProvider: string;
  issueId: string | null;
  issueTitle: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type ListTasksSuccess = {
  total: number;
  tasks: TaskSummary[];
};

export type ListTasksOutput = Result<ListTasksSuccess>;
