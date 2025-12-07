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

    // 投影後のセッションを取得
    const session = await taskRepository.findTaskSessionById(
      streamId,
      workspace.id,
      user.id,
    );

    if (!session) {
      return {
        success: false,
        error: "タスクセッションが見つかりません",
      };
    }

    // Slack 通知はポリシー outbox に委譲（ここでは通知しない）
    const slackNotification = {
      delivered: false,
      reason: "Delegated to policy outbox",
    } as const;

    return {
      success: true,
      data: {
        taskSessionId: session.id,
        status: session.status,
        issuedAt: session.createdAt,
        slackNotification,
      },
    };
  };
};
