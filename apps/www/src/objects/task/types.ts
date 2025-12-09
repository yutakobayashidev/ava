type TaskStatus =
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
      schemaVersion: 1;
      payload: { issue: Issue; initialSummary: string; occurredAt: Date };
    }
  | {
      type: "TaskUpdated";
      schemaVersion: 1;
      payload: {
        summary: string;
        occurredAt: Date;
      };
    }
  | {
      type: "TaskBlocked";
      schemaVersion: 1;
      payload: {
        blockId: string;
        reason: string;
        occurredAt: Date;
      };
    }
  | {
      type: "BlockResolved";
      schemaVersion: 1;
      payload: { blockId: string; reason: string; occurredAt: Date };
    }
  | {
      type: "TaskPaused";
      schemaVersion: 1;
      payload: {
        pauseId: string;
        reason: string;
        occurredAt: Date;
      };
    }
  | {
      type: "TaskResumed";
      schemaVersion: 1;
      payload: {
        summary: string;
        resumedFromPauseId?: string;
        occurredAt: Date;
      };
    }
  | {
      type: "TaskCompleted";
      schemaVersion: 1;
      payload: { summary: string; occurredAt: Date };
    }
  | {
      type: "TaskCancelled";
      schemaVersion: 1;
      payload: { reason?: string; occurredAt: Date };
    }
  | {
      type: "SlackThreadLinked";
      schemaVersion: 1;
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
