import { decide, replay } from "@/domain/task/decider";
import type { Command } from "@/domain/task/types";
import { processTaskPolicyOutbox } from "@/projections/policyOutboxProcessor";
import { queuePolicyEvents } from "@/projections/taskPolicyOutbox";
import { projectTaskEvents } from "@/projections/taskSessionProjector";
import { createEventStore } from "@/repos/event-store";
import type { HonoEnv } from "@/types";
import type { Database } from "@ava/database/client";
import * as schema from "@ava/database/schema";

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

    // FK制約を満たすため、初回のStartTaskでは先にタスクセッション行を作成しておく
    if (history.length === 0 && command.type === "StartTask") {
      const now = new Date();
      await deps.db
        .insert(schema.taskSessions)
        .values({
          id: streamId,
          userId: user.id,
          workspaceId: workspace.id,
          issueProvider: command.payload.issue.provider,
          issueId: command.payload.issue.id ?? null,
          issueTitle: command.payload.issue.title,
          initialSummary: command.payload.initialSummary,
          status: "in_progress",
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
    }

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
      userId: user.id,
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

    const nextState = replay(streamId, [...history, ...newEvents]);

    return {
      events: newEvents,
      persistedEvents: appendResult.persistedEvents,
      nextState,
      version: appendResult.newVersion,
    };
  };
};
