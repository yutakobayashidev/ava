import type {
  BadRequestError,
  NotFoundError,
  PaymentRequiredError,
} from "@/errors";
import type { DatabaseError } from "@/lib/db";
import type { TaskStatus, TaskStatusFilter } from "@/objects/task/task-status";
import type { Command, Event } from "@/objects/task/types";
import { HonoEnv } from "@/types";
import type { ResultAsync } from "neverthrow";
import type { TaskEvent } from "@ava/database/schema";
import type { replay } from "@/objects/task/decider";
import type { UnloadedCommand } from "./executor/types";

/**
 * 共通型
 */

export type BaseCommand<C extends Command> = {
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  taskSessionId: string;
  command: C;
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

type UpdateTaskCommand = BaseCommand<Extract<Command, { type: "AddProgress" }>>;

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

type CompleteTaskCommand = BaseCommand<
  Extract<Command, { type: "CompleteTask" }>
>;

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

type CancelTaskCommand = BaseCommand<Extract<Command, { type: "CancelTask" }>>;

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

type ReportBlockedCommand = BaseCommand<
  Extract<Command, { type: "ReportBlock" }>
>;

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

type PauseTaskCommand = BaseCommand<Extract<Command, { type: "PauseTask" }>>;

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

type ResumeTaskCommand = BaseCommand<Extract<Command, { type: "ResumeTask" }>>;

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

type ResolveBlockedCommand = BaseCommand<
  Extract<Command, { type: "ResolveBlock" }>
>;

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

type ListTasksCommand = {
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  input: ListTasksParams;
};

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

type TaskExecuteSuccess = {
  events: Event[];
  persistedEvents: TaskEvent[];
  state: ReturnType<typeof replay>;
  version: number;
};

export type TaskExecuteWorkflow = (
  command: UnloadedCommand,
) => ResultAsync<
  TaskExecuteSuccess,
  DatabaseError | BadRequestError | NotFoundError
>;
