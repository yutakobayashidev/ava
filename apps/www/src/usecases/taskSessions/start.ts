import type { TaskRepository } from "@/repos";
import { createTaskCommandExecutor } from "./commandExecutor";
import { createSubscriptionRepository } from "@/repos";
import { checkFreePlanLimit } from "@/services/subscriptionService";
import type { StartTaskInput, StartTaskOutput } from "./interface";
import { uuidv7 } from "uuidv7";

export const createStartTask = (
  taskRepository: TaskRepository,
  subscriptionRepository: ReturnType<typeof createSubscriptionRepository>,
  commandExecutorFactory: ReturnType<typeof createTaskCommandExecutor>,
) => {
  return async (input: StartTaskInput): Promise<StartTaskOutput> => {
    const { workspace, user, params } = input;
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

    const executeCommand = commandExecutorFactory;
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
