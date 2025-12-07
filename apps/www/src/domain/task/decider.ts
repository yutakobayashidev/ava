import {
  Command,
  Event,
  TaskState,
  initialState,
  newBlockId,
  newPauseId,
} from "./types";

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

function ensureNotTerminal(state: TaskState) {
  if (state.status === "completed" || state.status === "cancelled") {
    throw new Error("Terminal task cannot transition");
  }
}

export function decide(
  state: TaskState,
  command: Command,
  now = new Date(),
): Event[] {
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
      ensureNotTerminal(state);
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
      ensureNotTerminal(state);
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
      ensureNotTerminal(state);
      const block = state.unresolvedBlocks.find(
        (b) => b.id === command.payload.blockId,
      );
      if (!block) throw new Error("Block not found or already resolved");
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
      ensureNotTerminal(state);
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
      ensureNotTerminal(state);
      if (state.status !== "paused" && state.status !== "blocked") {
        throw new Error(`Cannot resume from status ${state.status}`);
      }
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
      ensureNotTerminal(state);
      return [
        {
          type: "TaskCompleted",
          payload: { summary: command.payload.summary, occurredAt: now },
        },
      ];
    }
    case "CancelTask": {
      ensureNotTerminal(state);
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
