import type { InternalServerError } from "@/errors";
import type { Result } from "neverthrow";
import { z } from "zod/v3";
import type {
  CompleteTaskSessionCompleted,
  CreateTaskSessionCompleted,
  ListTaskSessionsCompleted,
  PauseTaskCompleted,
  ReportBlockedCompleted,
  ResolveBlockedCompleted,
  ResumeTaskCompleted,
  UpdateTaskSessionCompleted,
} from "./interface";

/**
 * Task session MCP request schema definitions
 */

// Common schemas
const rawContextSchema = z
  .record(z.string(), z.unknown())
  .default({})
  .describe("Abstract metadata shareable to Slack");

const issueSchema = z.object({
  provider: z.enum(["github", "manual"]).describe("Issue provider"),
  id: z
    .string()
    .trim()
    .optional()
    .describe("Issue identifier like GitHub Issue number"),
  title: z.string().min(1, "Title is required").describe("Concise task title"),
});

// start_task
export const StartTaskRequestSchema = z.object({
  issue: issueSchema,
  initialSummary: z
    .string()
    .min(1, "Initial summary is required")
    .describe("Abstract situation and approach at the start"),
});

// update_task
export const UpdateTaskRequestSchema = z.object({
  taskSessionId: z
    .string()
    .min(1, "taskSessionId is required")
    .describe("Task ID returned from startTask"),
  summary: z
    .string()
    .min(1, "summary is required")
    .describe("Abstract description of progress"),
  rawContext: rawContextSchema,
});

// report_blocked
export const ReportBlockedRequestSchema = z.object({
  taskSessionId: z
    .string()
    .min(1, "taskSessionId is required")
    .describe("Task ID returned from startTask"),
  reason: z
    .string()
    .min(1, "reason is required")
    .describe("Summary of blocking reason"),
  rawContext: rawContextSchema,
});

// pause_task
export const PauseTaskRequestSchema = z.object({
  taskSessionId: z
    .string()
    .min(1, "taskSessionId is required")
    .describe("Task ID returned from startTask"),
  reason: z
    .string()
    .min(1, "reason is required")
    .describe("Summary of pause reason"),
  rawContext: rawContextSchema,
});

// resume_task
export const ResumeTaskRequestSchema = z.object({
  taskSessionId: z
    .string()
    .min(1, "taskSessionId is required")
    .describe("Task ID returned from startTask"),
  summary: z
    .string()
    .min(1, "summary is required")
    .describe("Comment on resume"),
  rawContext: rawContextSchema,
});

// complete_task
export const CompleteTaskRequestSchema = z.object({
  taskSessionId: z
    .string()
    .min(1, "taskSessionId is required")
    .describe("Task ID returned from startTask"),
  summary: z
    .string()
    .min(1, "summary is required")
    .describe("Abstract summary of completion"),
});

// resolve_blocked
export const ResolveBlockedRequestSchema = z.object({
  taskSessionId: z
    .string()
    .min(1, "taskSessionId is required")
    .describe("Task ID returned from startTask"),
  blockReportId: z
    .string()
    .min(1, "blockReportId is required")
    .describe(
      "Block report ID to resolve (obtained from completeTask or reportBlocked response)",
    ),
});

// list_tasks
export const ListTasksRequestSchema = z.object({
  status: z
    .enum(["in_progress", "blocked", "paused", "completed"])
    .optional()
    .describe("Status to filter (all statuses if omitted)"),
  limit: z
    .number()
    .positive()
    .max(100)
    .optional()
    .describe("Maximum number to retrieve (default: 50)"),
});

/**
 * Response conversion functions
 */

type TaskSessionCompleted =
  | CreateTaskSessionCompleted
  | UpdateTaskSessionCompleted
  | ReportBlockedCompleted
  | PauseTaskCompleted
  | ResumeTaskCompleted
  | CompleteTaskSessionCompleted
  | ResolveBlockedCompleted
  | ListTaskSessionsCompleted;

export const convertResultToMcpResponse = <T extends TaskSessionCompleted>(
  result: Result<T, InternalServerError>,
  successMessage?: string,
) => {
  return result.match(
    (completed) => {
      const data = completed.result;
      return successMessage
        ? JSON.stringify({ ...data, message: successMessage }, null, 2)
        : JSON.stringify(data, null, 2);
    },
    (error) => error.message,
  );
};
