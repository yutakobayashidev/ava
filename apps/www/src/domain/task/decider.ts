import {
  Command,
  Event,
  TaskState,
  initialState,
  newBlockId,
  newPauseId,
} from "./types";
import { validateTransition } from "../task-status";

export function evolve(state: TaskState, event: Event): TaskState {
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
        slackThread: event.payload,
      };
    default:
      return state;
  }
}

export function decide(
  state: TaskState,
  command: Command,
  now = new Date(),
): Event[] {
  if (!state.createdAt && command.type !== "StartTask") {
    throw new Error("タスクセッションが見つかりません");
  }

  switch (command.type) {
    case "StartTask": {
      if (state.createdAt) throw new Error("Task already started");
      return [
        {
          type: "TaskStarted",
          payload: { ...command.payload, occurredAt: now },
        },
      ];
    }
    case "AddProgress": {
      validateTransition(state.status, "in_progress");
      return [
        {
          type: "TaskUpdated",
          payload: {
            summary: command.payload.summary,
            rawContext: command.payload.rawContext ?? {},
            occurredAt: now,
          },
        },
      ];
    }
    case "ReportBlock": {
      validateTransition(state.status, "blocked");
      return [
        {
          type: "TaskBlocked",
          payload: {
            blockId: newBlockId(),
            reason: command.payload.reason,
            rawContext: command.payload.rawContext ?? {},
            occurredAt: now,
          },
        },
      ];
    }
    case "ResolveBlock": {
      const block = state.unresolvedBlocks.find(
        (b) => b.id === command.payload.blockId,
      );
      if (!block) throw new Error("Block not found or already resolved");
      const remaining = state.unresolvedBlocks.filter(
        (b) => b.id !== command.payload.blockId,
      );
      const nextStatus = remaining.length > 0 ? "blocked" : "in_progress";
      validateTransition(state.status, nextStatus);
      return [
        {
          type: "BlockResolved",
          payload: {
            blockId: command.payload.blockId,
            reason: block.reason,
            occurredAt: now,
          },
        },
      ];
    }
    case "PauseTask": {
      validateTransition(state.status, "paused");
      return [
        {
          type: "TaskPaused",
          payload: {
            pauseId: newPauseId(),
            reason: command.payload.reason,
            rawContext: command.payload.rawContext ?? {},
            occurredAt: now,
          },
        },
      ];
    }
    case "ResumeTask": {
      validateTransition(state.status, "in_progress");
      return [
        {
          type: "TaskResumed",
          payload: {
            summary: command.payload.summary,
            rawContext: command.payload.rawContext ?? {},
            resumedFromPauseId: state.lastPausedId,
            occurredAt: now,
          },
        },
      ];
    }
    case "CompleteTask": {
      validateTransition(state.status, "completed");
      return [
        {
          type: "TaskCompleted",
          payload: { summary: command.payload.summary, occurredAt: now },
        },
      ];
    }
    case "CancelTask": {
      validateTransition(state.status, "cancelled");
      return [
        {
          type: "TaskCancelled",
          payload: { reason: command.payload.reason, occurredAt: now },
        },
      ];
    }
    default:
      return [];
  }
}

export function replay(streamId: string, events: Event[]): TaskState {
  return events.reduce((state, event) => evolve(state, event), {
    ...initialState,
    streamId,
  });
}
