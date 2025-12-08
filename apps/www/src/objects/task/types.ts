import { uuidv7 } from "uuidv7";

type TaskStatus =
  | "in_progress"
  | "blocked"
  | "paused"
  | "completed"
  | "cancelled";

type Issue = {
  provider: "github" | "manual";
  id?: string | null;
  title: string;
};

export type Command =
  | { type: "StartTask"; payload: { issue: Issue; initialSummary: string } }
  | {
      type: "AddProgress";
      payload: { summary: string };
    }
  | {
      type: "ReportBlock";
      payload: { reason: string };
    }
  | { type: "ResolveBlock"; payload: { blockId: string } }
  | {
      type: "PauseTask";
      payload: { reason: string };
    }
  | {
      type: "ResumeTask";
      payload: { summary: string };
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
        occurredAt: Date;
      };
    }
  | {
      type: "TaskBlocked";
      payload: {
        blockId: string;
        reason: string;
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
        occurredAt: Date;
      };
    }
  | {
      type: "TaskResumed";
      payload: {
        summary: string;
        resumedFromPauseId?: string;
        occurredAt: Date;
      };
    }
  | { type: "TaskCompleted"; payload: { summary: string; occurredAt: Date } }
  | { type: "TaskCancelled"; payload: { reason?: string; occurredAt: Date } }
  | {
      type: "SlackThreadLinked";
      payload: { channel: string; threadTs: string; occurredAt: Date };
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
  return uuidv7();
}

export function newPauseId() {
  return uuidv7();
}
