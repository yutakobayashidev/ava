import { BadRequestError, NotFoundError } from "@/errors";
import { DatabaseError } from "@/lib/db";
import { decide, replay } from "@/objects/task/decider";
import { processTaskPolicyOutbox } from "@/projections/policyOutboxProcessor";
import { queuePolicyEvents } from "@/projections/taskPolicyOutbox";
import { projectTaskEvents } from "@/projections/taskSessionProjector";
import type { createEventStore } from "@/repos/event-store";
import type { Database } from "@ava/database/client";
import { okAsync, Result, ResultAsync } from "neverthrow";
import type {
  CommittedCommand,
  DecidedCommand,
  LoadedCommand,
  ProjectedCommand,
  UnloadedCommand,
} from "./types";

/**
 * Step 1: イベント履歴をロードして状態を再構築
 */
export const loadEvents =
  (eventStore: ReturnType<typeof createEventStore>) =>
  (command: UnloadedCommand): ResultAsync<LoadedCommand, DatabaseError> => {
    return eventStore.load(command.streamId).map((history) => ({
      ...command,
      kind: "loaded",
      history,
      state: replay(command.streamId, history),
    }));
  };

/**
 * Step 2: コマンドから新しいイベントを決定
 */
export const decideEvents = (
  command: LoadedCommand,
): Result<DecidedCommand, BadRequestError | NotFoundError> => {
  return decide(command.state, command.command, new Date()).map(
    (newEvents) => ({
      ...command,
      kind: "decided",
      newEvents,
      expectedVersion: command.history.length - 1,
    }),
  );
};

/**
 * Step 3: イベントを永続化
 */
export const commitEvents =
  (eventStore: ReturnType<typeof createEventStore>) =>
  (command: DecidedCommand): ResultAsync<CommittedCommand, DatabaseError> => {
    return eventStore
      .append(command.streamId, command.expectedVersion, command.newEvents)
      .map((appendResult) => ({
        ...command,
        kind: "committed",
        persistedEvents: appendResult.persistedEvents,
        version: appendResult.newVersion,
      }));
  };

/**
 * Step 4: プロジェクションとポリシーイベントの処理
 */
export const projectEvents =
  (db: Database) =>
  (command: CommittedCommand): ResultAsync<ProjectedCommand, DatabaseError> => {
    return projectTaskEvents(db, command.streamId, command.newEvents, {
      workspaceId: command.workspace.id,
      userId: command.user.id,
    })
      .andThen(() =>
        queuePolicyEvents(db, command.streamId, command.newEvents, {
          workspaceId: command.workspace.id,
          user: {
            id: command.user.id,
            name: command.user.name,
            email: command.user.email,
            slackId: command.user.slackId,
          },
          channel:
            command.state.slackThread?.channel ??
            command.workspace.notificationChannelId ??
            null,
          threadTs: command.state.slackThread?.threadTs ?? null,
        }),
      )
      .andThen(() =>
        // 可能な限り即時に通知するため、アウトボックスをその場で処理する
        // エラーは記録するが、プロジェクション全体は失敗させない
        processTaskPolicyOutbox(db).orElse((error) => {
          console.error("Failed to process task policy outbox", error);
          return okAsync(undefined);
        }),
      )
      .map(() => ({
        kind: "projected",
        events: command.newEvents,
        persistedEvents: command.persistedEvents,
        state: command.state,
        version: command.version,
      }));
  };
