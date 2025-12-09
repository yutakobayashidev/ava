import type { Command } from "@/objects/task/types";
import type { BaseCommand } from "@/usecases/taskSessions/interface";
import { Context } from "@/types";
import {
  constructCancelTaskWorkflow,
  constructCompleteTaskWorkflow,
  constructListTasksWorkflow,
  constructPauseTaskWorkflow,
  constructReportBlockedWorkflow,
  constructResolveBlockedWorkflow,
  constructResumeTaskWorkflow,
  constructStartTaskWorkflow,
  constructUpdateTaskWorkflow,
} from "@/usecases/taskSessions/constructor";
import {
  cancelTaskInputSchema,
  completeTaskInputSchema,
  formatErrorResponse,
  formatSuccessResponse,
  listTasksInputSchema,
  pauseTaskInputSchema,
  reportBlockedInputSchema,
  resolveBlockedInputSchema,
  resumeTaskInputSchema,
  startTaskInputSchema,
  updateTaskInputSchema,
} from "@/usecases/taskSessions/controller";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function createMcpServer(ctx: Context) {
  const server = new McpServer({
    name: "ava-mcp",
    version: "1.0.0",
  });

  const createCommand = <C extends Command>(
    taskSessionId: string,
    command: C,
  ): BaseCommand<C> => ({
    workspace: ctx.get("workspace"),
    user: ctx.get("user"),
    taskSessionId,
    command,
  });

  server.registerTool(
    "startTask",
    {
      title: "startTask",
      description: "開始サマリをSlackに共有するための入力仕様。",
      inputSchema: startTaskInputSchema,
    },
    (input) => {
      const result = constructStartTaskWorkflow(ctx)({
        workspace: ctx.get("workspace"),
        user: ctx.get("user"),
        input,
      });
      return result.match(
        (data) => formatSuccessResponse(data, "タスクの追跡を開始しました。"),
        (error) => formatErrorResponse(error),
      );
    },
  );

  server.registerTool(
    "updateTask",
    {
      title: "updateTask",
      description: "進捗の抽象的サマリを共有するための入力仕様。",
      inputSchema: updateTaskInputSchema,
    },
    (input) => {
      const { taskSessionId, ...payload } = input;
      const result = constructUpdateTaskWorkflow(ctx)(
        createCommand(taskSessionId, { type: "AddProgress", input: payload }),
      );
      return result.match(
        (data) => formatSuccessResponse(data, "進捗を保存しました。"),
        (error) => formatErrorResponse(error),
      );
    },
  );

  server.registerTool(
    "reportBlocked",
    {
      title: "reportBlocked",
      description: "ブロッキング情報を共有するための入力仕様。",
      inputSchema: reportBlockedInputSchema,
    },
    (input) => {
      const { taskSessionId, ...payload } = input;
      const result = constructReportBlockedWorkflow(ctx)(
        createCommand(taskSessionId, { type: "ReportBlock", input: payload }),
      );
      return result.match(
        (data) =>
          formatSuccessResponse(data, "ブロッキング情報を登録しました。"),
        (error) => formatErrorResponse(error),
      );
    },
  );

  server.registerTool(
    "pauseTask",
    {
      title: "pauseTask",
      description: "タスクを一時休止するための入力仕様。",
      inputSchema: pauseTaskInputSchema,
    },
    (input) => {
      const { taskSessionId, ...payload } = input;
      const result = constructPauseTaskWorkflow(ctx)(
        createCommand(taskSessionId, { type: "PauseTask", input: payload }),
      );
      return result.match(
        (data) => formatSuccessResponse(data, "タスクを一時休止しました。"),
        (error) => formatErrorResponse(error),
      );
    },
  );

  server.registerTool(
    "resumeTask",
    {
      title: "resumeTask",
      description: "一時休止したタスクを再開するための入力仕様。",
      inputSchema: resumeTaskInputSchema,
    },
    (input) => {
      const { taskSessionId, ...payload } = input;
      const result = constructResumeTaskWorkflow(ctx)(
        createCommand(taskSessionId, { type: "ResumeTask", input: payload }),
      );
      return result.match(
        (data) => formatSuccessResponse(data, "タスクを再開しました。"),
        (error) => formatErrorResponse(error),
      );
    },
  );

  server.registerTool(
    "completeTask",
    {
      title: "completeTask",
      description: "完了報告を共有するための入力仕様。",
      inputSchema: completeTaskInputSchema,
    },
    (input) => {
      const { taskSessionId, ...payload } = input;
      const result = constructCompleteTaskWorkflow(ctx)({
        workspace: ctx.get("workspace"),
        user: ctx.get("user"),
        taskSessionId,
        command: { type: "CompleteTask", input: payload },
      });
      return result.match(
        (data) =>
          formatSuccessResponse(
            data,
            data.unresolvedBlocks && data.unresolvedBlocks.length > 0
              ? "完了報告を保存しました。未解決のブロッキングがあります。resolveBlockedツールで解決を報告してください。"
              : "完了報告を保存しました。",
          ),
        (error) => formatErrorResponse(error),
      );
    },
  );

  server.registerTool(
    "cancelTask",
    {
      title: "cancelTask",
      description: "タスク中止を受け付けるための入力仕様。",
      inputSchema: cancelTaskInputSchema,
    },
    (input) => {
      const { taskSessionId, ...payload } = input;
      const result = constructCancelTaskWorkflow(ctx)({
        workspace: ctx.get("workspace"),
        user: ctx.get("user"),
        taskSessionId,
        command: { type: "CancelTask", input: payload },
      });
      return result.match(
        (data) => formatSuccessResponse(data, "タスクを中止しました。"),
        (error) => formatErrorResponse(error),
      );
    },
  );

  server.registerTool(
    "resolveBlocked",
    {
      title: "resolveBlocked",
      description: "ブロッキングが解決したことを報告する入力仕様。",
      inputSchema: resolveBlockedInputSchema,
    },
    (input) => {
      const { taskSessionId, blockReportId } = input;
      const result = constructResolveBlockedWorkflow(ctx)({
        workspace: ctx.get("workspace"),
        user: ctx.get("user"),
        taskSessionId,
        command: { type: "ResolveBlock", input: { blockId: blockReportId } },
      });
      return result.match(
        (data) =>
          formatSuccessResponse(data, "ブロッキングの解決を報告しました。"),
        (error) => formatErrorResponse(error),
      );
    },
  );

  server.registerTool(
    "listTasks",
    {
      title: "listTasks",
      description: "ユーザーのタスク一覧を取得する。",
      inputSchema: listTasksInputSchema,
    },
    (input) => {
      const result = constructListTasksWorkflow(ctx)({
        workspace: ctx.get("workspace"),
        user: ctx.get("user"),
        input,
      });
      return result.match(
        (data) => ({
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(data, null, 2),
            },
          ],
        }),
        (error) => formatErrorResponse(error),
      );
    },
  );

  return server;
}
