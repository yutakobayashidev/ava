import { HonoEnv } from "@/types";

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
// Start Task
// ============================================

export type StartTaskParams = {
  issue: {
    provider: "github" | "manual";
    id?: string;
    title: string;
  };
  initialSummary: string;
};

export type StartTaskInput = {
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  params: StartTaskParams;
};

export type StartTaskSuccess = {
  taskSessionId: string;
  status: string;
  issuedAt: Date;
  slackNotification: SlackNotificationResult;
};

export type StartTaskOutput =
  | { success: true; data: StartTaskSuccess }
  | { success: false; error: string };

// ============================================
// Update Task
// ============================================

export type UpdateTaskParams = {
  taskSessionId: string;
  summary: string;
  rawContext?: Record<string, unknown>;
};

export type UpdateTaskInput = {
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  params: UpdateTaskParams;
};

export type UpdateTaskSuccess = {
  taskSessionId: string;
  updateId: string;
  status: string;
  summary: string | null;
  slackNotification: SlackNotificationResult;
};

export type UpdateTaskOutput =
  | { success: true; data: UpdateTaskSuccess }
  | { success: false; error: string };

// ============================================
// Complete Task
// ============================================

export type CompleteTaskParams = {
  taskSessionId: string;
  summary: string;
};

export type CompleteTaskInput = {
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  params: CompleteTaskParams;
};

export type CompleteTaskSuccess = {
  taskSessionId: string;
  completionId: string;
  status: string;
  slackNotification: SlackNotificationResult;
  unresolvedBlocks?: Array<{
    blockReportId: string;
    reason: string | null;
    createdAt: Date;
  }>;
};

export type CompleteTaskOutput =
  | { success: true; data: CompleteTaskSuccess }
  | { success: false; error: string };

// ============================================
// Report Blocked
// ============================================

export type ReportBlockedParams = {
  taskSessionId: string;
  reason: string;
  rawContext?: Record<string, unknown>;
};

export type ReportBlockedInput = {
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  params: ReportBlockedParams;
};

export type ReportBlockedSuccess = {
  taskSessionId: string;
  blockReportId: string;
  status: string;
  reason: string | null;
  slackNotification: SlackNotificationResult;
};

export type ReportBlockedOutput =
  | { success: true; data: ReportBlockedSuccess }
  | { success: false; error: string };

// ============================================
// Pause Task
// ============================================

export type PauseTaskParams = {
  taskSessionId: string;
  reason: string;
  rawContext?: Record<string, unknown>;
};

export type PauseTaskInput = {
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  params: PauseTaskParams;
};

export type PauseTaskSuccess = {
  taskSessionId: string;
  pauseReportId: string;
  status: string;
  pausedAt: Date;
  slackNotification: SlackNotificationResult;
};

export type PauseTaskOutput =
  | { success: true; data: PauseTaskSuccess }
  | { success: false; error: string };

// ============================================
// Resume Task
// ============================================

export type ResumeTaskParams = {
  taskSessionId: string;
  summary: string;
  rawContext?: Record<string, unknown>;
};

export type ResumeTaskInput = {
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  params: ResumeTaskParams;
};

export type ResumeTaskSuccess = {
  taskSessionId: string;
  status: string;
  resumedAt: Date;
  slackNotification: SlackNotificationResult;
};

export type ResumeTaskOutput =
  | { success: true; data: ResumeTaskSuccess }
  | { success: false; error: string };

// ============================================
// Resolve Blocked
// ============================================

export type ResolveBlockedParams = {
  taskSessionId: string;
  blockReportId: string;
};

export type ResolveBlockedInput = {
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  params: ResolveBlockedParams;
};

export type ResolveBlockedSuccess = {
  taskSessionId: string;
  blockReportId: string;
  status: string;
  resolvedAt: Date;
  slackNotification: SlackNotificationResult;
};

export type ResolveBlockedOutput =
  | { success: true; data: ResolveBlockedSuccess }
  | { success: false; error: string };

// ============================================
// List Tasks
// ============================================

export type ListTasksParams = {
  status?: "inProgress" | "blocked" | "paused" | "completed";
  limit?: number;
};

export type ListTasksInput = {
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  params: ListTasksParams;
};

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

export type ListTasksOutput =
  | { success: true; data: ListTasksSuccess }
  | { success: false; error: string };
