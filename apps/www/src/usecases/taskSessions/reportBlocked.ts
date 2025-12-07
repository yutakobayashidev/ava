import type { TaskRepository } from "@/repos";
import { createTaskCommandExecutor } from "./commandExecutor";
import type { ReportBlockedInput, ReportBlockedOutput } from "./interface";

export const createReportBlocked = (
  taskRepository: TaskRepository,
  commandExecutorFactory: ReturnType<typeof createTaskCommandExecutor>,
) => {
  return async (input: ReportBlockedInput): Promise<ReportBlockedOutput> => {
    const { workspace, user, params } = input;
    const { taskSessionId, reason, rawContext } = params;

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
        type: "ReportBlock",
        payload: { reason, rawContext },
      },
    });

    return {
      success: true,
      data: {
        taskSessionId: taskSessionId,
        blockReportId: result.persistedEvents[0]?.id ?? "",
        status: result.nextState.status,
        reason,
      },
    };
  };
};
