import type { TaskRepository } from "@/repos";
import { createTaskCommandExecutor } from "./commandExecutor";
import type { UpdateTaskInput, UpdateTaskOutput } from "./interface";

export const createUpdateTask = (
  taskRepository: TaskRepository,
  commandExecutorFactory: ReturnType<typeof createTaskCommandExecutor>,
) => {
  return async (input: UpdateTaskInput): Promise<UpdateTaskOutput> => {
    const { workspace, user, params } = input;
    const { taskSessionId, summary, rawContext } = params;

    const existingSession = await taskRepository.findTaskSessionById(
      taskSessionId,
      workspace.id,
      user.id,
    );

    if (!existingSession) {
      return {
        success: false,
        error: "タスクセッションが見つかりません",
      };
    }

    const executeCommand = commandExecutorFactory;
    const result = await executeCommand({
      streamId: taskSessionId,
      workspace,
      user,
      command: {
        type: "AddProgress",
        payload: { summary, rawContext },
      },
    });

    const session = await taskRepository.findTaskSessionById(
      taskSessionId,
      workspace.id,
      user.id,
    );

    if (!session) {
      return {
        success: false,
        error: "タスクの更新に失敗しました",
      };
    }

    // Slack 通知はポリシー outbox に委譲
    const slackNotification = {
      delivered: false,
      reason: "Delegated to policy outbox",
    } as const;

    return {
      success: true,
      data: {
        taskSessionId: session.id,
        updateId: result.persistedEvents[0]?.id ?? "",
        status: session.status,
        summary,
        slackNotification,
      },
    };
  };
};
