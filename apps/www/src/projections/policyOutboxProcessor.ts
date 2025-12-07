import { and, eq } from "drizzle-orm";
import { z } from "zod/v3";
import type { Database } from "@ava/database/client";
import * as schema from "@ava/database/schema";
import { createWorkspaceRepository } from "@/repos";
import { createSlackNotificationService } from "@/services/slackNotificationService";
import {
  buildTaskBlockedMessage,
  buildTaskCompletedMessage,
  buildTaskPausedMessage,
  buildTaskResumedMessage,
  buildTaskStartedMessage,
  buildTaskUpdateMessage,
} from "@/usecases/taskSessions/slackMessages";

const commonFields = {
  workspaceId: z.string(),
  channel: z.string().nullable(),
  threadTs: z.string().nullable(),
} as const;

const notifyPayloadSchema = z.discriminatedUnion("template", [
  z.object({
    template: z.literal("started"),
    summary: z.string().optional(),
    ...commonFields,
  }),
  z.object({
    template: z.literal("updated"),
    summary: z.string().optional(),
    ...commonFields,
  }),
  z.object({
    template: z.literal("blocked"),
    reason: z.string().optional(),
    ...commonFields,
  }),
  z.object({
    template: z.literal("block_resolved"),
    blockId: z.string().optional(),
    ...commonFields,
  }),
  z.object({
    template: z.literal("paused"),
    reason: z.string().optional(),
    ...commonFields,
  }),
  z.object({
    template: z.literal("resumed"),
    summary: z.string().optional(),
    ...commonFields,
  }),
  z.object({
    template: z.literal("completed"),
    summary: z.string().optional(),
    ...commonFields,
  }),
]);

const reactionPayloadSchema = z.object({
  workspaceId: z.string(),
  channel: z.string().nullable(),
  threadTs: z.string().nullable(),
  emoji: z.string().optional(),
});

function buildMessage(
  policy: typeof schema.taskPolicyOutbox.$inferSelect,
  payload: z.infer<typeof notifyPayloadSchema>,
) {
  const template = payload.template;
  switch (template) {
    case "started":
      return buildTaskStartedMessage({
        session: { id: policy.taskSessionId },
        issue: { title: "", provider: "manual", id: null },
        initialSummary: payload.summary ?? "",
        user: { name: "", email: "", slackId: undefined },
      });
    case "updated":
      return buildTaskUpdateMessage({
        summary: payload.summary ?? "",
      });
    case "blocked":
      return buildTaskBlockedMessage({
        session: { id: policy.taskSessionId },
        reason: payload.reason ?? "",
        blockReportId: policy.id,
      });
    case "block_resolved":
      return buildTaskResumedMessage({ summary: "" });
    case "paused":
      return buildTaskPausedMessage({
        session: { id: policy.taskSessionId },
        reason: payload.reason ?? "",
      });
    case "resumed":
      return buildTaskResumedMessage({
        summary: payload.summary ?? "",
      });
    case "completed":
      return buildTaskCompletedMessage({
        summary: payload.summary ?? "",
      });
    default:
      return null;
  }
}

export async function processTaskPolicyOutbox(db: Database) {
  const workspaceRepo = createWorkspaceRepository(db);
  const slackService = createSlackNotificationService(workspaceRepo);

  const pending = await db
    .select()
    .from(schema.taskPolicyOutbox)
    .where(eq(schema.taskPolicyOutbox.status, "pending"))
    .limit(50);

  for (const policy of pending) {
    const notifyPayload =
      policy.policyType === "slack_notify"
        ? notifyPayloadSchema.safeParse(policy.payload)
        : null;
    const reactionPayload =
      policy.policyType === "slack_reaction"
        ? reactionPayloadSchema.safeParse(policy.payload)
        : null;

    const payload = notifyPayload?.success
      ? notifyPayload.data
      : reactionPayload?.success
        ? reactionPayload.data
        : null;

    if (!payload) {
      await db
        .update(schema.taskPolicyOutbox)
        .set({ status: "failed", processedAt: new Date() })
        .where(eq(schema.taskPolicyOutbox.id, policy.id));
      continue;
    }

    const workspaceId = payload.workspaceId;
    if (!workspaceId) {
      await db
        .update(schema.taskPolicyOutbox)
        .set({ status: "failed", processedAt: new Date() })
        .where(eq(schema.taskPolicyOutbox.id, policy.id));
      continue;
    }

    const workspace = await workspaceRepo.findWorkspaceById(workspaceId);
    if (!workspace || !workspace.botAccessToken) {
      await db
        .update(schema.taskPolicyOutbox)
        .set({ status: "failed", processedAt: new Date() })
        .where(eq(schema.taskPolicyOutbox.id, policy.id));
      continue;
    }

    const channel = payload.channel ?? undefined;
    const threadTs = payload.threadTs ?? undefined;

    if (!channel || !threadTs) {
      await db
        .update(schema.taskPolicyOutbox)
        .set({ status: "failed", processedAt: new Date() })
        .where(eq(schema.taskPolicyOutbox.id, policy.id));
      continue;
    }

    let delivered = false;
    let error: string | undefined;

    if (policy.policyType === "slack_notify") {
      if (!notifyPayload?.success) {
        await db
          .update(schema.taskPolicyOutbox)
          .set({ status: "failed", processedAt: new Date() })
          .where(eq(schema.taskPolicyOutbox.id, policy.id));
        continue;
      }
      const message = buildMessage(policy, notifyPayload.data);
      if (message) {
        const notification = await slackService.postMessage({
          workspace,
          channel,
          message,
          threadTs,
        });
        delivered = notification.delivered;
        error = notification.error;
      }
    } else if (policy.policyType === "slack_reaction") {
      if (!reactionPayload?.success) {
        await db
          .update(schema.taskPolicyOutbox)
          .set({ status: "failed", processedAt: new Date() })
          .where(eq(schema.taskPolicyOutbox.id, policy.id));
        continue;
      }
      const emoji = reactionPayload.data.emoji ?? "";
      try {
        await slackService.addReaction({
          workspace,
          channel,
          timestamp: threadTs,
          emoji,
        });
        delivered = true;
      } catch (err) {
        error = err instanceof Error ? err.message : "reaction_failed";
      }
    }

    await db
      .update(schema.taskPolicyOutbox)
      .set({
        status: delivered ? "processed" : "failed",
        processedAt: new Date(),
        payload: {
          ...policy.payload,
          error,
        },
      })
      .where(and(eq(schema.taskPolicyOutbox.id, policy.id)));
  }
}
