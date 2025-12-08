import { createTaskCommandExecutor } from "./commandExecutor";
import type { ResolveBlockedInput, ResolveBlockedOutput } from "./interface";

export const createResolveBlocked = (
  commandExecutorFactory: ReturnType<typeof createTaskCommandExecutor>,
) => {
  return async (input: ResolveBlockedInput): Promise<ResolveBlockedOutput> => {
    const { workspace, user, params } = input;
    const { taskSessionId, blockReportId } = params;

    const executeCommand = commandExecutorFactory;
    try {
      const result = await executeCommand({
        streamId: taskSessionId,
        workspace,
        user,
        command: {
          type: "ResolveBlock",
          payload: { blockId: blockReportId },
        },
      });

      return {
        success: true,
        data: {
          taskSessionId: taskSessionId,
          blockReportId: blockReportId,
          status: result.nextState.status,
          resolvedAt: result.persistedEvents[0]?.createdAt ?? new Date(),
        },
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "ブロッキングの解決に失敗しました";
      return {
        success: false,
        error:
          message === "Block not found or already resolved"
            ? "ブロッキングの解決処理に失敗しました"
            : message,
      };
    }
  };
};
