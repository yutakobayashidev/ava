import { apply } from "@/objects/task/decider";
import { type TaskCommandExecutor } from "./commandExecutor";
import type { UpdateTaskCommand, UpdateTaskOutput } from "./interface";

type UpdateTaskWorkflow = (
  command: UpdateTaskCommand,
) => Promise<UpdateTaskOutput>;

export const createUpdateTaskWorkflow = (
  executeCommand: TaskCommandExecutor,
): UpdateTaskWorkflow => {
  return async (command) => {
    const { workspace, user, params } = command;
    const { taskSessionId, summary } = params;

    try {
      const result = await executeCommand({
        streamId: taskSessionId,
        workspace,
        user,
        command: {
          type: "AddProgress",
          payload: { summary },
        },
      });

      const nextState = apply(result.state, result.events);

      return {
        success: true,
        data: {
          taskSessionId: taskSessionId,
          updateId: result.persistedEvents[0].id,
          status: nextState.status,
          summary,
        },
      };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : "タスクの更新に失敗しました",
      };
    }
  };
};
