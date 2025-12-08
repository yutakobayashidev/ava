import { projectTaskEvents } from "@/projections/taskSessionProjector";
import {
  notifyPayloadSchema,
  type ParsedNotifyPayload,
  type ParsedPolicy,
  reactionPayloadSchema,
  type ParsedReactionPayload,
} from "@/projections/taskPolicySchemas";
import { createWorkspaceRepository } from "@/repos";
import { createEventStore } from "@/repos/event-store";
import { createSlackNotificationService } from "@/services/slackNotificationService";
import {
  buildBlockResolvedMessage,
  buildTaskBlockedMessage,
  buildTaskCompletedMessage,
  buildTaskPausedMessage,
  buildTaskResumedMessage,
  buildTaskStartedMessage,
  buildTaskUpdateMessage,
} from "@/usecases/taskSessions/slackMessages";
import type { Database } from "@ava/database/client";
import * as schema from "@ava/database/schema";
import { and, eq } from "drizzle-orm";
import type { NotifyPayload } from "./taskPolicyOutbox";

type NotifyTemplate = NotifyPayload["template"];
type TaskPolicyRow = typeof schema.taskPolicyOutbox.$inferSelect;

const sessionRefFromPolicy = (policy: TaskPolicyRow) => ({
  id: policy.taskSessionId,
});

type NotifyBuilderMap = {
  [K in NotifyTemplate]: (
    policy: TaskPolicyRow,
    payload: Extract<ParsedNotifyPayload, { template: K }>,
  ) => ReturnType<
    | typeof buildTaskStartedMessage
    | typeof buildTaskUpdateMessage
    | typeof buildTaskBlockedMessage
    | typeof buildBlockResolvedMessage
    | typeof buildTaskPausedMessage
    | typeof buildTaskResumedMessage
    | typeof buildTaskCompletedMessage
  >;
};

type ProcessResult = {
  delivered: boolean;
  channel: string | null;
  threadTs: string | null;
  error?: string;
};

function parsePolicyPayload(
  policy: typeof schema.taskPolicyOutbox.$inferSelect,
): ParsedPolicy | null {
  switch (policy.policyType) {
    case "slack_notify": {
      const parsed = notifyPayloadSchema.safeParse(policy.payload);
      return parsed.success
        ? { kind: "notify" as const, payload: parsed.data }
        : null;
    }
    case "slack_reaction": {
      const parsed = reactionPayloadSchema.safeParse(policy.payload);
      return parsed.success
        ? { kind: "reaction" as const, payload: parsed.data }
        : null;
    }
    default:
      return null;
  }
}

async function updatePolicyStatus(params: {
  db: Database;
  policy: typeof schema.taskPolicyOutbox.$inferSelect;
  status: "processed" | "failed";
  channel: string | null;
  threadTs: string | null;
  error?: string;
}) {
  const { db, policy, status, channel, threadTs, error } = params;
  await db
    .update(schema.taskPolicyOutbox)
    .set({
      status,
      processedAt: new Date(),
      payload: {
        ...policy.payload,
        channel,
        threadTs,
        error,
      },
    })
    .where(and(eq(schema.taskPolicyOutbox.id, policy.id)));
}

const notifyMessageBuilders: NotifyBuilderMap = {
  started: (_policy, payload) =>
    buildTaskStartedMessage({
      session: sessionRefFromPolicy(_policy),
      issue: payload.issue,
      initialSummary: payload.initialSummary,
      user: payload.user,
    }),
  updated: (_policy, payload) =>
    buildTaskUpdateMessage({
      summary: payload.summary,
    }),
  blocked: (policy, payload) =>
    buildTaskBlockedMessage({
      session: sessionRefFromPolicy(policy),
      reason: payload.reason,
      blockReportId: payload.blockId,
    }),
  block_resolved: (_policy, payload) =>
    buildBlockResolvedMessage({
      blockReason: payload.reason,
    }),
  paused: (policy, payload) =>
    buildTaskPausedMessage({
      session: sessionRefFromPolicy(policy),
      reason: payload.reason,
    }),
  resumed: (_policy, payload) =>
    buildTaskResumedMessage({
      summary: payload.summary,
    }),
  completed: (_policy, payload) =>
    buildTaskCompletedMessage({
      summary: payload.summary,
    }),
};

function buildNotifyMessage(
  policy: TaskPolicyRow,
  payload: ParsedNotifyPayload,
) {
  switch (payload.template) {
    case "started":
      return notifyMessageBuilders.started(policy, payload);
    case "updated":
      return notifyMessageBuilders.updated(policy, payload);
    case "blocked":
      return notifyMessageBuilders.blocked(policy, payload);
    case "block_resolved":
      return notifyMessageBuilders.block_resolved(policy, payload);
    case "paused":
      return notifyMessageBuilders.paused(policy, payload);
    case "resumed":
      return notifyMessageBuilders.resumed(policy, payload);
    case "completed":
      return notifyMessageBuilders.completed(policy, payload);
    default:
      return null;
  }
}

async function appendSlackThreadLink(params: {
  db: Database;
  taskSessionId: string;
  workspaceId: string;
  userId?: string;
  channel: string;
  threadTs: string;
}): Promise<{ success: boolean; error?: string }> {
  const { db, taskSessionId, workspaceId, userId, channel, threadTs } = params;
  if (!userId) return { success: true };

  const eventStore = createEventStore(db);

  const tryAppend = async () => {
    const history = await eventStore.load(taskSessionId);
    const expectedVersion = history.length - 1;
    const event = {
      type: "SlackThreadLinked",
      payload: { channel, threadTs, occurredAt: new Date() },
    } as const;

    const appendResult = await eventStore.append(
      taskSessionId,
      expectedVersion,
      [event],
    );

    await projectTaskEvents(db, taskSessionId, [event], {
      workspaceId,
      userId,
    });

    return appendResult;
  };

  try {
    await tryAppend();
    return { success: true };
  } catch (err) {
    const isConcurrencyConflict =
      err instanceof Error && err.message.includes("Concurrency conflict");
    if (isConcurrencyConflict) {
      try {
        await tryAppend();
        return { success: true };
      } catch (retryErr) {
        return {
          success: false,
          error:
            retryErr instanceof Error
              ? retryErr.message
              : "failed_to_link_slack_thread",
        };
      }
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "failed_to_link_slack_thread",
    };
  }
}

async function processNotify(params: {
  db: Database;
  policy: typeof schema.taskPolicyOutbox.$inferSelect;
  payload: ParsedNotifyPayload;
  workspace: schema.Workspace;
  channel: string | null;
  threadTs: string | null;
  slackService: ReturnType<typeof createSlackNotificationService>;
}): Promise<ProcessResult> {
  const { db, policy, payload, workspace, slackService } = params;
  let channel = params.channel;
  let threadTs = params.threadTs;
  let delivered = false;
  let error: string | undefined;

  if (!channel) {
    return { delivered: false, channel, threadTs, error: "channel_not_set" };
  }

  const message = buildNotifyMessage(policy, payload);
  if (!message) {
    return { delivered: false, channel, threadTs };
  }

  const notification = await slackService.postMessage({
    workspace,
    channel,
    message,
    threadTs: threadTs ?? undefined,
  });
  delivered = notification.delivered;
  error = notification.error;

  if (
    delivered &&
    !threadTs &&
    (notification.threadTs ?? notification.channel)
  ) {
    channel = notification.channel ?? channel ?? null;
    threadTs = notification.threadTs ?? null;

    const linkResult = await appendSlackThreadLink({
      db,
      taskSessionId: policy.taskSessionId,
      workspaceId: workspace.id,
      userId: payload.userId,
      channel: channel ?? "",
      threadTs: threadTs ?? "",
    });

    if (!linkResult.success) {
      delivered = false;
      error = linkResult.error;
    }
  }

  return { delivered, channel, threadTs, error };
}

async function processReaction(params: {
  payload: ParsedReactionPayload;
  workspace: schema.Workspace;
  channel: string | null;
  threadTs: string | null;
  slackService: ReturnType<typeof createSlackNotificationService>;
}): Promise<ProcessResult> {
  const { payload, workspace, slackService } = params;
  const channel = params.channel;
  const threadTs = params.threadTs;

  if (!channel || !threadTs) {
    return {
      delivered: false,
      channel,
      threadTs,
      error: "channel_or_thread_missing",
    };
  }

  const emoji = payload.emoji ?? "";
  try {
    await slackService.addReaction({
      workspace,
      channel,
      timestamp: threadTs,
      emoji,
    });
    return { delivered: true, channel, threadTs };
  } catch (err) {
    return {
      delivered: false,
      channel,
      threadTs,
      error: err instanceof Error ? err.message : "reaction_failed",
    };
  }
}

type PolicyProcessor = {
  process: (params: {
    db: Database;
    policy: TaskPolicyRow;
    workspace: schema.Workspace;
    channel: string | null;
    threadTs: string | null;
    slackService: ReturnType<typeof createSlackNotificationService>;
  }) => Promise<ProcessResult>;
};

const policyProcessors: Record<ParsedPolicy["kind"], PolicyProcessor> = {
  notify: {
    process: async ({
      db,
      policy,
      workspace,
      channel,
      threadTs,
      slackService,
    }) => {
      const parsed = parsePolicyPayload(policy);
      if (!parsed || parsed.kind !== "notify") {
        return { delivered: false, channel, threadTs };
      }
      return processNotify({
        db,
        policy,
        payload: parsed.payload,
        workspace,
        channel,
        threadTs,
        slackService,
      });
    },
  },
  reaction: {
    process: async ({ policy, workspace, channel, threadTs, slackService }) => {
      const parsed = parsePolicyPayload(policy);
      if (!parsed || parsed.kind !== "reaction") {
        return { delivered: false, channel, threadTs };
      }
      return processReaction({
        payload: parsed.payload,
        workspace,
        channel,
        threadTs,
        slackService,
      });
    },
  },
};

async function processSinglePolicy(
  db: Database,
  policy: TaskPolicyRow,
  workspaceRepo: ReturnType<typeof createWorkspaceRepository>,
  slackService: ReturnType<typeof createSlackNotificationService>,
): Promise<void> {
  const parsed = parsePolicyPayload(policy);
  if (!parsed) {
    await updatePolicyStatus({
      db,
      policy,
      status: "failed",
      channel: null,
      threadTs: null,
      error: "invalid_payload",
    });
    return;
  }

  const workspace = await workspaceRepo.findWorkspaceById(
    parsed.payload.workspaceId,
  );
  if (!workspace || !workspace.botAccessToken) {
    await updatePolicyStatus({
      db,
      policy,
      status: "failed",
      channel: parsed.payload.channel ?? null,
      threadTs: parsed.payload.threadTs ?? null,
      error: "workspace_not_found_or_bot_not_configured",
    });
    return;
  }

  const channel =
    parsed.payload.channel ?? workspace.notificationChannelId ?? null;
  const threadTs = parsed.payload.threadTs ?? null;

  const processor = policyProcessors[parsed.kind];
  const result = await processor.process({
    db,
    policy,
    workspace,
    channel,
    threadTs,
    slackService,
  });

  await updatePolicyStatus({
    db,
    policy,
    status: result.delivered ? "processed" : "failed",
    channel: result.channel,
    threadTs: result.threadTs,
    error: result.error,
  });
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
    await processSinglePolicy(db, policy, workspaceRepo, slackService);
  }
}
