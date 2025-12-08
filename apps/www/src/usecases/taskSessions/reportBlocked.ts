import { createTaskCommandExecutor } from "./commandExecutor";
import { apply } from "@/objects/task/decider";
import type { ReportBlockedInput, ReportBlockedOutput } from "./interface";

export const createReportBlocked = (
  commandExecutorFactory: ReturnType<typeof createTaskCommandExecutor>,
) => {
  return async (input: ReportBlockedInput): Promise<ReportBlockedOutput> => {
    const { workspace, user, params } = input;
    const { taskSessionId, reason } = params;

    const executeCommand = commandExecutorFactory;
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
