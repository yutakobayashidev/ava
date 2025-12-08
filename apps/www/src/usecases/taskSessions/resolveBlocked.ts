import { apply } from "@/objects/task/decider";
import { type TaskCommandExecutor } from "./commandExecutor";
import type { ResolveBlockedCommand, ResolveBlockedOutput } from "./interface";

type ResolveBlockedWorkflow = (
  command: ResolveBlockedCommand,
) => Promise<ResolveBlockedOutput>;

export const createResolveBlockedWorkflow = (
  executeCommand: TaskCommandExecutor,
): ResolveBlockedWorkflow => {
  return async (command) => {
    const { workspace, user, params } = command;
    const { taskSessionId, blockReportId } = params;

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

      const nextState = apply(result.state, result.events);

      return {
        success: true,
        data: {
          taskSessionId: taskSessionId,
          blockReportId: blockReportId,
          status: nextState.status,
          resolvedAt: result.persistedEvents[0].createdAt,
        },
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "ブロッキングの解決に失敗しました";
      return {
        success: false,
        error: message,
      };
    }
  };
};
