import { BadRequestError, NotFoundError } from "@/errors";
import { err, ok, type Result } from "neverthrow";
import { validateTransition } from "./task-status";
import {
  Command,
  Event,
  TaskState,
  initialState,
  newBlockId,
  newPauseId,
} from "./types";

function evolve(state: TaskState, event: Event): TaskState {
  switch (event.type) {
    case "TaskStarted":
      return {
        ...state,
        status: "in_progress",
        issue: event.payload.issue,
        initialSummary: event.payload.initialSummary,
        createdAt: event.payload.occurredAt,
        updatedAt: event.payload.occurredAt,
      };
    case "TaskUpdated":
      return {
        ...state,
        status: "in_progress",
        updatedAt: event.payload.occurredAt,
      };
    case "TaskBlocked":
      return {
        ...state,
        status: "blocked",
        unresolvedBlocks: [
          {
            id: event.payload.blockId,
            reason: event.payload.reason,
            createdAt: event.payload.occurredAt,
          },
          ...state.unresolvedBlocks,
        ],
        updatedAt: event.payload.occurredAt,
      };
    case "BlockResolved": {
      const remaining = state.unresolvedBlocks.filter(
        (block) => block.id !== event.payload.blockId,
      );
      return {
        ...state,
        status: remaining.length > 0 ? "blocked" : "in_progress",
        unresolvedBlocks: remaining,
        updatedAt: event.payload.occurredAt,
      };
    }
    case "TaskPaused":
      return {
        ...state,
        status: "paused",
        lastPausedId: event.payload.pauseId,
        updatedAt: event.payload.occurredAt,
      };
    case "TaskResumed":
      return {
        ...state,
        status: "in_progress",
        updatedAt: event.payload.occurredAt,
      };
    case "TaskCompleted":
      return {
        ...state,
        status: "completed",
        updatedAt: event.payload.occurredAt,
      };
    case "TaskCancelled":
      return {
        ...state,
        status: "cancelled",
        updatedAt: event.payload.occurredAt,
      };
    case "SlackThreadLinked":
      return {
        ...state,
        slackThread: {
          channel: event.payload.channel,
          threadTs: event.payload.threadTs,
        },
        updatedAt: event.payload.occurredAt,
      };
    default:
      return state;
  }
}

export function decide(
  state: TaskState,
  command: Command,
  now = new Date(),
): Result<Event[], BadRequestError | NotFoundError> {
  const hasUnresolvedBlocks = state.unresolvedBlocks.length > 0;

  if (!state.createdAt && command.type !== "StartTask") {
    return err(new NotFoundError("Task session not found"));
  }

  switch (command.type) {
    case "StartTask": {
      if (state.createdAt) {
        return err(new BadRequestError("Task already started"));
      }
      return ok([
        {
          type: "TaskStarted",
          schemaVersion: 1,
          payload: {
            issue: command.payload.issue,
            initialSummary: command.payload.initialSummary,
            occurredAt: now,
          },
        },
      ]);
    }
    case "AddProgress": {
      if (hasUnresolvedBlocks) {
        return err(
          new BadRequestError(
            "Resolve blocking issues before updating progress",
          ),
        );
      }
      return validateTransition(state.status, "in_progress").map(() => [
        {
          type: "TaskUpdated",
          schemaVersion: 1,
          payload: {
            summary: command.payload.summary,
            occurredAt: now,
          },
        },
      ]);
    }
    case "ReportBlock": {
      return validateTransition(state.status, "blocked").map(() => [
        {
          type: "TaskBlocked",
          schemaVersion: 1,
          payload: {
            blockId: newBlockId(),
            reason: command.payload.reason,
            occurredAt: now,
          },
        },
      ]);
    }
    case "ResolveBlock": {
      const block = state.unresolvedBlocks.find(
        (b) => b.id === command.payload.blockId,
      );
      if (!block) {
        return err(new NotFoundError("Block not found or already resolved"));
      }
      const remaining = state.unresolvedBlocks.filter(
        (b) => b.id !== command.payload.blockId,
      );
      const nextStatus = remaining.length > 0 ? "blocked" : "in_progress";
      return validateTransition(state.status, nextStatus).map(() => [
        {
          type: "BlockResolved",
          schemaVersion: 1,
          payload: {
            blockId: command.payload.blockId,
            reason: block.reason,
            occurredAt: now,
          },
        },
      ]);
    }
    case "PauseTask": {
      return validateTransition(state.status, "paused").map(() => [
        {
          type: "TaskPaused",
          schemaVersion: 1,
          payload: {
            pauseId: newPauseId(),
            reason: command.payload.reason,
            occurredAt: now,
          },
        },
      ]);
    }
    case "ResumeTask": {
      if (hasUnresolvedBlocks) {
        return err(
          new BadRequestError("Resolve blocking issues before resuming"),
        );
      }
      return validateTransition(state.status, "in_progress").map(() => [
        {
          type: "TaskResumed",
          schemaVersion: 1,
          payload: {
            summary: command.payload.summary,
            resumedFromPauseId: state.lastPausedId,
            occurredAt: now,
          },
        },
      ]);
    }
    case "CompleteTask": {
      return validateTransition(state.status, "completed").map(() => [
        {
          type: "TaskCompleted",
          schemaVersion: 1,
          payload: { summary: command.payload.summary, occurredAt: now },
        },
      ]);
    }
    case "CancelTask": {
      return validateTransition(state.status, "cancelled").map(() => [
        {
          type: "TaskCancelled",
          schemaVersion: 1,
          payload: { reason: command.payload.reason, occurredAt: now },
        },
      ]);
    }
    default:
      return ok([]);
  }
}

export function apply(state: TaskState, events: Event[]): TaskState {
  return events.reduce((current, event) => evolve(current, event), state);
}

export function replay(streamId: string, events: Event[]): TaskState {
  return events.reduce((state, event) => evolve(state, event), {
    ...initialState,
    streamId,
  });
}
