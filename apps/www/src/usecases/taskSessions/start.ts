import { type SubscriptionRepository } from "@/repos";
import { checkFreePlanLimit } from "@/services/subscriptionService";
import { uuidv7 } from "uuidv7";
import { type TaskCommandExecutor } from "./commandExecutor";
import type { StartTaskCommand, StartTaskOutput } from "./interface";

type StartTaskWorkflow = (
  command: StartTaskCommand,
) => Promise<StartTaskOutput>;

export const createStartTaskWorkflow = (
  subscriptionRepository: SubscriptionRepository,
  executeCommand: TaskCommandExecutor,
): StartTaskWorkflow => {
  return async (command) => {
    const { workspace, user, params } = command;
    const { issue, initialSummary } = params;

    // プラン制限のチェック
    const limitError = await checkFreePlanLimit(
      user.id,
      subscriptionRepository,
    );
    if (limitError) {
      return {
        success: false,
        error: limitError,
      };
    }

    const streamId = uuidv7();

    try {
      await executeCommand({
        streamId,
        workspace,
        user,
        command: {
          type: "StartTask",
          payload: {
            issue,
            initialSummary,
          },
        },
      });
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to start task",
      };
    }

    return {
      success: true,
      data: {
        taskSessionId: streamId,
        status: "in_progress",
        issuedAt: new Date(),
      },
    };
  };
};
