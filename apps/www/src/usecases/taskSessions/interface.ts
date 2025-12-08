import type { TaskStatusFilter } from "@/objects/task/task-status";
import { HonoEnv } from "@/types";

/**
 * 共通型
 */

export type BaseCommand<Params> = {
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  params: Params;
};

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Start Task
 */

export type StartTaskParams = {
  issue: {
    provider: "github" | "manual";
    id?: string;
    title: string;
  };
  initialSummary: string;
};

export type StartTaskCommand = BaseCommand<StartTaskParams>;

export type StartTaskSuccess = {
  taskSessionId: string;
  status: string;
  issuedAt: Date;
};

export type StartTaskOutput = Result<StartTaskSuccess>;

/**
 * Update Task
 */

export type UpdateTaskParams = {
  taskSessionId: string;
  summary: string;
};

export type UpdateTaskCommand = BaseCommand<UpdateTaskParams>;

export type UpdateTaskSuccess = {
  taskSessionId: string;
  updateId: string;
  status: string;
  summary: string | null;
};

export type UpdateTaskOutput = Result<UpdateTaskSuccess>;

/**
 * Complete Task
 */

export type CompleteTaskParams = {
  taskSessionId: string;
  summary: string;
};

export type CompleteTaskCommand = BaseCommand<CompleteTaskParams>;

export type CompleteTaskSuccess = {
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

export type CancelTaskParams = {
  taskSessionId: string;
  reason?: string;
};

export type CancelTaskCommand = BaseCommand<CancelTaskParams>;

export type CancelTaskSuccess = {
  taskSessionId: string;
  cancellationId: string;
  status: string;
  cancelledAt: Date;
};

export type CancelTaskOutput = Result<CancelTaskSuccess>;

/**
 * Report Blocked
 */

export type ReportBlockedParams = {
  taskSessionId: string;
  reason: string;
};

export type ReportBlockedCommand = BaseCommand<ReportBlockedParams>;

export type ReportBlockedSuccess = {
  taskSessionId: string;
  blockReportId: string;
  status: string;
  reason: string | null;
};

export type ReportBlockedOutput = Result<ReportBlockedSuccess>;

/**
 * Pause Task
 */

export type PauseTaskParams = {
  taskSessionId: string;
  reason: string;
};

export type PauseTaskCommand = BaseCommand<PauseTaskParams>;

export type PauseTaskSuccess = {
  taskSessionId: string;
  pauseReportId: string;
  status: string;
  pausedAt: Date;
};

export type PauseTaskOutput = Result<PauseTaskSuccess>;

/**
 * Resume Task
 */

export type ResumeTaskParams = {
  taskSessionId: string;
  summary: string;
};

export type ResumeTaskCommand = BaseCommand<ResumeTaskParams>;

export type ResumeTaskSuccess = {
  taskSessionId: string;
  status: string;
  resumedAt: Date;
};

export type ResumeTaskOutput = Result<ResumeTaskSuccess>;

/**
 * Resolve Blocked
 */

export type ResolveBlockedParams = {
  taskSessionId: string;
  blockReportId: string;
};

export type ResolveBlockedCommand = BaseCommand<ResolveBlockedParams>;

export type ResolveBlockedSuccess = {
  taskSessionId: string;
  blockReportId: string;
  status: string;
  resolvedAt: Date;
};

export type ResolveBlockedOutput = Result<ResolveBlockedSuccess>;

/**
 * List Tasks
 */

export type ListTasksParams = {
  status?: TaskStatusFilter;
  limit?: number;
};

export type ListTasksCommand = BaseCommand<ListTasksParams>;

export type TaskSummary = {
  taskSessionId: string;
  issueProvider: string;
  issueId: string | null;
  issueTitle: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ListTasksSuccess = {
  total: number;
  tasks: TaskSummary[];
};

export type ListTasksOutput = Result<ListTasksSuccess>;
