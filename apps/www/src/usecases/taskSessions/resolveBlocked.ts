import type { TaskRepository } from "@/repos";
import { createTaskCommandExecutor } from "./commandExecutor";
import type { ResolveBlockedInput, ResolveBlockedOutput } from "./interface";

export const createResolveBlocked = (
  taskRepository: TaskRepository,
  commandExecutorFactory: ReturnType<typeof createTaskCommandExecutor>,
) => {
  return async (input: ResolveBlockedInput): Promise<ResolveBlockedOutput> => {
    const { workspace, user, params } = input;
    const { taskSessionId, blockReportId } = params;

    const currentSession = await taskRepository.findTaskSessionById(
      taskSessionId,
      workspace.id,
      user.id,
    );

    if (!currentSession) {
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
  };
};
