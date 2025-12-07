import { replay, decide } from "@/domain/task/decider";
import type { Command } from "@/domain/task/types";
import { createEventStore } from "@/repos/event-store";
import { projectTaskEvents } from "@/projections/taskSessionProjector";
import type { Database } from "@ava/database/client";
import type { HonoEnv } from "@/types";

export type TaskCommandExecutorDeps = {
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

    const nextState = replay(streamId, [...history, ...newEvents]);

    return {
      events: newEvents,
      persistedEvents: appendResult.persistedEvents,
      nextState,
      version: appendResult.newVersion,
    };
  };
};
