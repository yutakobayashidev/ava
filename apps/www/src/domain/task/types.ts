import { randomUUID } from "crypto";

export type TaskStatus =
  | "in_progress"
  | "blocked"
  | "paused"
  | "completed"
  | "cancelled";

export type Issue = {
  provider: "github" | "manual";
  id?: string | null;
  title: string;
};

export type Command =
  | { type: "StartTask"; payload: { issue: Issue; initialSummary: string } }
  | {
      type: "AddProgress";
      payload: { summary: string; rawContext?: Record<string, unknown> };
    }
  | {
      type: "ReportBlock";
      payload: { reason: string; rawContext?: Record<string, unknown> };
    }
  | { type: "ResolveBlock"; payload: { blockId: string } }
  | {
      type: "PauseTask";
      payload: { reason: string; rawContext?: Record<string, unknown> };
    }
  | {
      type: "ResumeTask";
      payload: { summary: string; rawContext?: Record<string, unknown> };
    }
  | { type: "CompleteTask"; payload: { summary: string } }
  | { type: "CancelTask"; payload: { reason?: string } };

export type Event =
  | {
      type: "TaskStarted";
      payload: { issue: Issue; initialSummary: string; occurredAt: Date };
    }
  | {
      type: "TaskUpdated";
      payload: {
        summary: string;
        rawContext: Record<string, unknown>;
        occurredAt: Date;
      };
    }
  | {
      type: "TaskBlocked";
      payload: {
        blockId: string;
        reason: string;
        rawContext: Record<string, unknown>;
        occurredAt: Date;
      };
    }
  | {
      type: "BlockResolved";
      payload: { blockId: string; reason: string; occurredAt: Date };
    }
  | {
      type: "TaskPaused";
      payload: {
        pauseId: string;
        reason: string;
        rawContext: Record<string, unknown>;
        occurredAt: Date;
      };
    }
  | {
      type: "TaskResumed";
      payload: {
        summary: string;
        rawContext: Record<string, unknown>;
        resumedFromPauseId?: string;
        occurredAt: Date;
      };
    }
  | { type: "TaskCompleted"; payload: { summary: string; occurredAt: Date } }
  | { type: "TaskCancelled"; payload: { reason?: string; occurredAt: Date } }
  | {
      type: "SlackThreadLinked";
      payload: { channel: string; threadTs: string };
    };

export type TaskState = {
  streamId: string;
  status: TaskStatus;
  issue?: Issue;
  initialSummary?: string;
  slackThread?: { channel: string; threadTs: string };
  unresolvedBlocks: Array<{ id: string; reason: string; createdAt: Date }>;
  lastPausedId?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export const initialState: TaskState = {
  streamId: "",
  status: "in_progress",
  unresolvedBlocks: [],
};

export function newBlockId() {
  return randomUUID();
}

export function newPauseId() {
  return randomUUID();
}
