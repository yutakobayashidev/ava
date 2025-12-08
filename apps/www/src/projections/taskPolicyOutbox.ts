import type { Event } from "@/objects/task/types";
import type { Database } from "@ava/database/client";
import * as schema from "@ava/database/schema";
import { uuidv7 } from "uuidv7";

const POLICY_TYPES = {
  slackNotify: "slack_notify",
  slackReaction: "slack_reaction",
} as const;

type Envelope = {
  workspaceId: string;
  userId: string;
  channel?: string | null;
  threadTs?: string | null;
};

type PolicyPayload = {
  policyType: string;
  payload: Record<string, unknown>;
};

function toPolicyPayload(event: Event, envelope: Envelope): PolicyPayload[] {
  const basePayload = {
    workspaceId: envelope.workspaceId,
    userId: envelope.userId,
    channel: envelope.channel ?? null,
    threadTs: envelope.threadTs ?? null,
  } as const;

  switch (event.type) {
    case "TaskStarted":
      return [
        {
          policyType: POLICY_TYPES.slackNotify,
          payload: {
            ...basePayload,
            template: "started",
            summary: event.payload.initialSummary,
          },
        },
      ];
    case "TaskUpdated":
      return [
        {
          policyType: POLICY_TYPES.slackNotify,
          payload: {
            ...basePayload,
            template: "updated",
            summary: event.payload.summary,
          },
        },
      ];
    case "TaskBlocked":
      return [
        {
          policyType: POLICY_TYPES.slackNotify,
          payload: {
            ...basePayload,
            template: "blocked",
            reason: event.payload.reason,
          },
        },
      ];
    case "BlockResolved":
      return [
        {
          policyType: POLICY_TYPES.slackNotify,
          payload: {
            ...basePayload,
            template: "block_resolved",
            blockId: event.payload.blockId,
            reason: event.payload.reason,
          },
        },
      ];
    case "TaskPaused":
      return [
        {
          policyType: POLICY_TYPES.slackNotify,
          payload: {
            ...basePayload,
            template: "paused",
            reason: event.payload.reason,
          },
        },
      ];
    case "TaskResumed":
      return [
        {
          policyType: POLICY_TYPES.slackNotify,
          payload: {
            ...basePayload,
            template: "resumed",
            summary: event.payload.summary,
          },
        },
      ];
    case "TaskCompleted":
      return [
        {
          policyType: POLICY_TYPES.slackNotify,
          payload: {
            ...basePayload,
            template: "completed",
            summary: event.payload.summary,
          },
        },
        {
          policyType: POLICY_TYPES.slackReaction,
          payload: {
            ...basePayload,
            emoji: "white_check_mark",
          },
        },
      ];
    default:
      return [];
  }
}

export async function queuePolicyEvents(
  db: Database,
  streamId: string,
  events: Event[],
  envelope: Envelope,
) {
  const rows = events.flatMap((event) =>
    toPolicyPayload(event, envelope).map((policy) => ({
      id: uuidv7(),
      taskSessionId: streamId,
      policyType: policy.policyType,
      payload: policy.payload,
      status: "pending" as const,
    })),
  );

  if (rows.length === 0) return;

  await db.insert(schema.taskPolicyOutbox).values(rows);
}
