import type {
  BadRequestError,
  NotFoundError,
  PaymentRequiredError,
} from "@/errors";
import type { DatabaseError } from "@/lib/db";
import type { TaskStatus, TaskStatusFilter } from "@/objects/task/task-status";
import { HonoEnv } from "@/types";
import type { ResultAsync } from "neverthrow";

/**
 * 共通型
 */

type BaseCommand<Input> = {
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  input: Input;
};

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

type StartTaskCommand = {
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  input: StartTaskParams;
};

type StartTaskSuccess = {
  taskSessionId: string;
  status: TaskStatus;
  issuedAt: Date;
};

export type StartTaskWorkflow = (
  command: StartTaskCommand,
) => ResultAsync<
  StartTaskSuccess,
  DatabaseError | PaymentRequiredError | BadRequestError | NotFoundError
>;

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

export type UpdateTaskWorkflow = (
  command: UpdateTaskCommand,
) => ResultAsync<
  UpdateTaskSuccess,
  DatabaseError | BadRequestError | NotFoundError
>;

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

export type CompleteTaskWorkflow = (
  command: CompleteTaskCommand,
) => ResultAsync<
  CompleteTaskSuccess,
  DatabaseError | BadRequestError | NotFoundError
>;

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

export type CancelTaskWorkflow = (
  command: CancelTaskCommand,
) => ResultAsync<
  CancelTaskSuccess,
  DatabaseError | BadRequestError | NotFoundError
>;

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

export type ReportBlockedWorkflow = (
  command: ReportBlockedCommand,
) => ResultAsync<
  ReportBlockedSuccess,
  DatabaseError | BadRequestError | NotFoundError
>;

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

export type PauseTaskWorkflow = (
  command: PauseTaskCommand,
) => ResultAsync<
  PauseTaskSuccess,
  DatabaseError | BadRequestError | NotFoundError
>;

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

export type ResumeTaskWorkflow = (
  command: ResumeTaskCommand,
) => ResultAsync<
  ResumeTaskSuccess,
  DatabaseError | BadRequestError | NotFoundError
>;

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

export type ResolveBlockedWorkflow = (
  command: ResolveBlockedCommand,
) => ResultAsync<
  ResolveBlockedSuccess,
  DatabaseError | BadRequestError | NotFoundError
>;

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

export type ListTasksWorkflow = (
  command: ListTasksCommand,
) => ResultAsync<ListTasksSuccess, DatabaseError>;

/**
 * Task Execute Command (Internal)
 */

type TaskExecuteParams = {
  streamId: string;
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  command: import("@/objects/task/types").Command;
};

type TaskExecuteSuccess = {
  events: import("@/objects/task/types").Event[];
  persistedEvents: import("@ava/database/schema").TaskEvent[];
  state: ReturnType<typeof import("@/objects/task/decider").replay>;
  version: number;
};

export type TaskExecuteCommand = (
  params: TaskExecuteParams,
) => ResultAsync<
  TaskExecuteSuccess,
  DatabaseError | BadRequestError | NotFoundError
>;
