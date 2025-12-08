import type { Event } from "@/objects/task/types";
import type { Database } from "@ava/database/client";
import * as schema from "@ava/database/schema";
import { uuidv7 } from "uuidv7";

const POLICY_TYPES = {
  slackNotify: "slack_notify",
  slackReaction: "slack_reaction",
} as const;

type Issue = {
  provider: "github" | "manual";
  id?: string | null;
  title: string;
};

type UserInfo = {
  id: string;
  name?: string | null;
  email?: string | null;
  slackId?: string | null;
};

type Envelope = {
  workspaceId: string;
  user: UserInfo;
  channel?: string | null;
  threadTs?: string | null;
};

type NotifyPayload =
  | {
      template: "started";
      issue: Issue;
      initialSummary: string;
      user: UserInfo;
    }
  | { template: "updated"; summary: string }
  | { template: "blocked"; blockId: string; reason: string }
  | { template: "block_resolved"; blockId: string; reason: string }
  | { template: "paused"; pauseId: string; reason: string }
  | { template: "resumed"; summary: string }
  | { template: "completed"; summary: string };

type ReactionPayload = {
  emoji: string;
};

type PolicyPayload = {
  workspaceId: string;
  user: UserInfo;
  channel: string | null;
  threadTs: string | null;
} & (
  | { policyType: "slack_notify"; data: NotifyPayload }
  | { policyType: "slack_reaction"; data: ReactionPayload }
);

export type { NotifyPayload, ReactionPayload, PolicyPayload, UserInfo };

function toPolicyPayload(event: Event, envelope: Envelope): PolicyPayload[] {
  const baseEnvelope = {
    workspaceId: envelope.workspaceId,
    user: envelope.user,
    channel: envelope.channel ?? null,
    threadTs: envelope.threadTs ?? null,
  } as const;

  switch (event.type) {
    case "TaskStarted":
      return [
        {
          ...baseEnvelope,
          policyType: POLICY_TYPES.slackNotify,
          data: {
            template: "started",
            issue: event.payload.issue,
            initialSummary: event.payload.initialSummary,
            user: envelope.user,
          },
        },
      ];
    case "TaskUpdated":
      return [
        {
          ...baseEnvelope,
          policyType: POLICY_TYPES.slackNotify,
          data: {
            template: "updated",
            summary: event.payload.summary,
          },
        },
      ];
    case "TaskBlocked":
      return [
        {
          ...baseEnvelope,
          policyType: POLICY_TYPES.slackNotify,
          data: {
            template: "blocked",
            blockId: event.payload.blockId,
            reason: event.payload.reason,
          },
        },
      ];
    case "BlockResolved":
      return [
        {
          ...baseEnvelope,
          policyType: POLICY_TYPES.slackNotify,
          data: {
            template: "block_resolved",
            blockId: event.payload.blockId,
            reason: event.payload.reason,
          },
        },
      ];
    case "TaskPaused":
      return [
        {
          ...baseEnvelope,
          policyType: POLICY_TYPES.slackNotify,
          data: {
            template: "paused",
            pauseId: event.payload.pauseId,
            reason: event.payload.reason,
          },
        },
      ];
    case "TaskResumed":
      return [
        {
          ...baseEnvelope,
          policyType: POLICY_TYPES.slackNotify,
          data: {
            template: "resumed",
            summary: event.payload.summary,
          },
        },
      ];
    case "TaskCompleted":
      return [
        {
          ...baseEnvelope,
          policyType: POLICY_TYPES.slackNotify,
          data: {
            template: "completed",
            summary: event.payload.summary,
          },
        },
        {
          ...baseEnvelope,
          policyType: POLICY_TYPES.slackReaction,
          data: {
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
      payload: {
        workspaceId: policy.workspaceId,
        userId: policy.user.id,
        user: policy.user,
        channel: policy.channel,
        threadTs: policy.threadTs,
        ...policy.data,
      },
      status: "pending" as const,
    })),
  );

  if (rows.length === 0) return;

  await db.insert(schema.taskPolicyOutbox).values(rows);
}
