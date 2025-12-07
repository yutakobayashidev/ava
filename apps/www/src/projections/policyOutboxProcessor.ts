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

const payloadSchema = z
  .object({
    workspaceId: z.string().optional(),
    channel: z.string().nullable().optional(),
    threadTs: z.string().nullable().optional(),
    template: z.string().optional(),
    summary: z.string().optional(),
    reason: z.string().optional(),
    blockId: z.string().optional(),
    emoji: z.string().optional(),
  })
  .passthrough();

function buildMessage(policy: typeof schema.taskPolicyOutbox.$inferSelect) {
  const payloadResult = payloadSchema.safeParse(policy.payload);
  if (!payloadResult.success) return null;
  const payload = payloadResult.data;
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
    const payloadResult = payloadSchema.safeParse(policy.payload);
    if (!payloadResult.success) {
      await db
        .update(schema.taskPolicyOutbox)
        .set({ status: "failed", processedAt: new Date() })
        .where(eq(schema.taskPolicyOutbox.id, policy.id));
      continue;
    }
    const payload = payloadResult.data;
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

    const channel = readString(payload, "channel");
    const threadTs = readString(payload, "threadTs");

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
      const message = buildMessage(policy);
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
      const emoji = readString(payload, "emoji") ?? "";
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
