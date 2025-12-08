import { apply } from "@/objects/task/decider";
import { type TaskCommandExecutor } from "./commandExecutor";
import type { ReportBlockedCommand, ReportBlockedOutput } from "./interface";

export type ReportBlockedWorkflow = (
  command: ReportBlockedCommand,
) => Promise<ReportBlockedOutput>;

export const createReportBlockedWorkflow = (
  executeCommand: TaskCommandExecutor,
): ReportBlockedWorkflow => {
  return async (command) => {
    const { workspace, user, params } = command;
    const { taskSessionId, reason } = params;

    try {
      const result = await executeCommand({
        streamId: taskSessionId,
        workspace,
        user,
        command: {
          type: "ReportBlock",
          payload: { reason },
        },
      });

      const nextState = apply(result.state, result.events);

      return {
        success: true,
        data: {
          taskSessionId: taskSessionId,
          blockReportId: result.persistedEvents[0].id,
          status: nextState.status,
          reason,
        },
      };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "ブロッキング情報の登録に失敗しました",
      };
    }
  };
};
