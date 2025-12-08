import { decide, replay } from "@/objects/task/decider";
import type { Command } from "@/objects/task/types";
import { processTaskPolicyOutbox } from "@/projections/policyOutboxProcessor";
import { queuePolicyEvents } from "@/projections/taskPolicyOutbox";
import { projectTaskEvents } from "@/projections/taskSessionProjector";
import { createEventStore } from "@/repos/event-store";
import type { HonoEnv } from "@/types";
import type { Database } from "@ava/database/client";

type TaskCommandExecutorDeps = {
  db: Database;
};

export const createTaskCommandExecutor = (deps: TaskCommandExecutorDeps) => {
  const eventStore = createEventStore(deps.db);

  return async (params: {
    streamId: string;
    workspace: HonoEnv["Variables"]["workspace"];
    user: HonoEnv["Variables"]["user"];
    command: Command;
  }) => {
    const { streamId, workspace, user, command } = params;
    const history = await eventStore.load(streamId);
    const state = replay(streamId, history);

    const newEvents = decide(state, command, new Date());
    const expectedVersion = history.length - 1;

    const appendResult = await eventStore.append(
      streamId,
      expectedVersion,
      newEvents,
    );

    await projectTaskEvents(deps.db, streamId, newEvents, {
      workspaceId: workspace.id,
      userId: user.id,
    });

    await queuePolicyEvents(deps.db, streamId, newEvents, {
      workspaceId: workspace.id,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        slackId: user.slackId,
      },
      channel:
        state.slackThread?.channel ?? workspace.notificationChannelId ?? null,
      threadTs: state.slackThread?.threadTs ?? null,
    });

    // 可能な限り即時に通知するため、アウトボックスをその場で処理する
    try {
      await processTaskPolicyOutbox(deps.db);
    } catch (err) {
      console.error("Failed to process task policy outbox", err);
    }

    return {
      events: newEvents,
      persistedEvents: appendResult.persistedEvents,
      state,
      version: appendResult.newVersion,
    };
  };
};

export type TaskCommandExecutor = ReturnType<typeof createTaskCommandExecutor>;
