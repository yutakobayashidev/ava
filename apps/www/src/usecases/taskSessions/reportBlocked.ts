import { createTaskCommandExecutor } from "./commandExecutor";
import type { ReportBlockedInput, ReportBlockedOutput } from "./interface";

export const createReportBlocked = (
  commandExecutorFactory: ReturnType<typeof createTaskCommandExecutor>,
) => {
  return async (input: ReportBlockedInput): Promise<ReportBlockedOutput> => {
    const { workspace, user, params } = input;
    const { taskSessionId, reason, rawContext } = params;

    const executeCommand = commandExecutorFactory;
    try {
      const result = await executeCommand({
        streamId: taskSessionId,
        workspace,
        user,
        command: {
          type: "ReportBlock",
          payload: { reason, rawContext },
        },
      });

      return {
        success: true,
        data: {
          taskSessionId: taskSessionId,
          blockReportId: result.persistedEvents[0].id,
          status: result.nextState.status,
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
