import type { TaskStatus, TaskStatusFilter } from "@/objects/task/task-status";
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

type StartTaskCommand = BaseCommand<StartTaskParams>;

type StartTaskSuccess = {
  taskSessionId: string;
  status: TaskStatus;
  issuedAt: Date;
};

type StartTaskOutput = Result<StartTaskSuccess>;

export type StartTaskWorkflow = (
  command: StartTaskCommand,
) => Promise<StartTaskOutput>;

/**
 * Update Task
 */

type UpdateTaskParams = {
  taskSessionId: string;
  summary: string;
};

type UpdateTaskCommand = BaseCommand<UpdateTaskParams>;

type UpdateTaskSuccess = {
  taskSessionId: string;
  updateId: string;
  status: TaskStatus;
  summary: string | null;
};

type UpdateTaskOutput = Result<UpdateTaskSuccess>;

export type UpdateTaskWorkflow = (
  command: UpdateTaskCommand,
) => Promise<UpdateTaskOutput>;

/**
 * Complete Task
 */

type CompleteTaskParams = {
  taskSessionId: string;
  summary: string;
};

type CompleteTaskCommand = BaseCommand<CompleteTaskParams>;

export type CompleteTaskSuccess = {
  taskSessionId: string;
  completionId: string;
  status: TaskStatus;
  unresolvedBlocks?: Array<{
    blockReportId: string;
    reason: string | null;
    createdAt: Date;
  }>;
};

type CompleteTaskOutput = Result<CompleteTaskSuccess>;

export type CompleteTaskWorkflow = (
  command: CompleteTaskCommand,
) => Promise<CompleteTaskOutput>;

/**
 * Cancel Task
 */

type CancelTaskParams = {
  taskSessionId: string;
  reason?: string;
};

type CancelTaskCommand = BaseCommand<CancelTaskParams>;

type CancelTaskSuccess = {
  taskSessionId: string;
  cancellationId: string;
  status: TaskStatus;
  cancelledAt: Date;
};

type CancelTaskOutput = Result<CancelTaskSuccess>;

export type CancelTaskWorkflow = (
  command: CancelTaskCommand,
) => Promise<CancelTaskOutput>;

/**
 * Report Blocked
 */

type ReportBlockedParams = {
  taskSessionId: string;
  reason: string;
};

type ReportBlockedCommand = BaseCommand<ReportBlockedParams>;

type ReportBlockedSuccess = {
  taskSessionId: string;
  blockReportId: string;
  status: TaskStatus;
  reason: string | null;
};

type ReportBlockedOutput = Result<ReportBlockedSuccess>;

export type ReportBlockedWorkflow = (
  command: ReportBlockedCommand,
) => Promise<ReportBlockedOutput>;

/**
 * Pause Task
 */

type PauseTaskParams = {
  taskSessionId: string;
  reason: string;
};

type PauseTaskCommand = BaseCommand<PauseTaskParams>;

type PauseTaskSuccess = {
  taskSessionId: string;
  pauseReportId: string;
  status: TaskStatus;
  pausedAt: Date;
};

type PauseTaskOutput = Result<PauseTaskSuccess>;

export type PauseTaskWorkflow = (
  command: PauseTaskCommand,
) => Promise<PauseTaskOutput>;

/**
 * Resume Task
 */

type ResumeTaskParams = {
  taskSessionId: string;
  summary: string;
};

type ResumeTaskCommand = BaseCommand<ResumeTaskParams>;

type ResumeTaskSuccess = {
  taskSessionId: string;
  status: TaskStatus;
  resumedAt: Date;
};

type ResumeTaskOutput = Result<ResumeTaskSuccess>;

export type ResumeTaskWorkflow = (
  command: ResumeTaskCommand,
) => Promise<ResumeTaskOutput>;

/**
 * Resolve Blocked
 */

type ResolveBlockedParams = {
  taskSessionId: string;
  blockReportId: string;
};

type ResolveBlockedCommand = BaseCommand<ResolveBlockedParams>;

type ResolveBlockedSuccess = {
  taskSessionId: string;
  blockReportId: string;
  status: TaskStatus;
  resolvedAt: Date;
};

type ResolveBlockedOutput = Result<ResolveBlockedSuccess>;

export type ResolveBlockedWorkflow = (
  command: ResolveBlockedCommand,
) => Promise<ResolveBlockedOutput>;

/**
 * List Tasks
 */

type ListTasksParams = {
  status?: TaskStatusFilter;
  limit?: number;
};

type ListTasksCommand = BaseCommand<ListTasksParams>;

type TaskSummary = {
  taskSessionId: string;
  issueProvider: string;
  issueId: string | null;
  issueTitle: string;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
};

type ListTasksSuccess = {
  total: number;
  tasks: TaskSummary[];
};

type ListTasksOutput = Result<ListTasksSuccess>;

export type ListTasksWorkflow = (
  command: ListTasksCommand,
) => Promise<ListTasksOutput>;
