import { apply } from "@/objects/task/decider";
import { type TaskCommandExecutor } from "./commandExecutor";
import type { ResumeTaskCommand, ResumeTaskOutput } from "./interface";

type ResumeTaskWorkflow = (
  command: ResumeTaskCommand,
) => Promise<ResumeTaskOutput>;

export const createResumeTaskWorkflow = (
  executeCommand: TaskCommandExecutor,
): ResumeTaskWorkflow => {
  return async (command) => {
    const { workspace, user, params } = command;
    const { taskSessionId, summary } = params;

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

      const nextState = apply(result.state, result.events);

      return {
        success: true,
        data: {
          taskSessionId: taskSessionId,
          status: nextState.status,
          resumedAt: result.persistedEvents[0].createdAt,
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
