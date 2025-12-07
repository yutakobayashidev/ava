import { uuidv7 } from "uuidv7";
import type { Database } from "@ava/database/client";
import * as schema from "@ava/database/schema";
import type { Event } from "@/domain/task/types";

const POLICY_TYPES = {
  slackNotify: "slack_notify",
  slackReaction: "slack_reaction",
} as const;

function toPolicyPayload(
  event: Event,
): Array<{ policyType: string; payload: Record<string, unknown> }> {
  switch (event.type) {
    case "TaskStarted":
      return [
        {
          policyType: POLICY_TYPES.slackNotify,
          payload: { template: "started" },
        },
      ];
    case "TaskUpdated":
      return [
        {
          policyType: POLICY_TYPES.slackNotify,
          payload: { template: "updated" },
        },
      ];
    case "TaskBlocked":
      return [
        {
          policyType: POLICY_TYPES.slackNotify,
          payload: { template: "blocked" },
        },
      ];
    case "BlockResolved":
      return [
        {
          policyType: POLICY_TYPES.slackNotify,
          payload: { template: "block_resolved" },
        },
      ];
    case "TaskPaused":
      return [
        {
          policyType: POLICY_TYPES.slackNotify,
          payload: { template: "paused" },
        },
      ];
    case "TaskResumed":
      return [
        {
          policyType: POLICY_TYPES.slackNotify,
          payload: { template: "resumed" },
        },
      ];
    case "TaskCompleted":
      return [
        {
          policyType: POLICY_TYPES.slackNotify,
          payload: { template: "completed" },
        },
        {
          policyType: POLICY_TYPES.slackReaction,
          payload: { emoji: "white_check_mark" },
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
  _context: { workspaceId: string; userId: string },
) {
  const rows = events.flatMap((event) =>
    toPolicyPayload(event).map((policy) => ({
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
