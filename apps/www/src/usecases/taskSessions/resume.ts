import { createTaskCommandExecutor } from "./commandExecutor";
import type { ResumeTaskInput, ResumeTaskOutput } from "./interface";

export const createResumeTask = (
  commandExecutorFactory: ReturnType<typeof createTaskCommandExecutor>,
) => {
  return async (input: ResumeTaskInput): Promise<ResumeTaskOutput> => {
    const { workspace, user, params } = input;
    const { taskSessionId, summary } = params;

    const executeCommand = commandExecutorFactory;
    try {
      const result = await executeCommand({
        streamId: taskSessionId,
        workspace,
        user,
        command: {
          type: "ResumeTask",
          payload: { summary },
        },
      });

      return {
        success: true,
        data: {
          taskSessionId: taskSessionId,
          status: result.nextState.status,
          resumedAt: result.persistedEvents[0]?.createdAt ?? new Date(),
        },
      };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : "タスクの再開処理に失敗しました",
      };
    }
  };
};
