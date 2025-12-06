import type { SlackMessage } from "@/services/slackNotificationService";

/**
 * タスク開始メッセージを構築
 */
export function buildTaskStartedMessage(params: {
  session: { id: string };
  issue: {
    title: string;
    provider: string;
    id?: string | null;
  };
  initialSummary: string;
  user: {
    name?: string | null;
    email?: string | null;
    slackId?: string | null;
  };
}): SlackMessage {
  const { session, issue, initialSummary, user } = params;

  const issueIdText = issue.id ? ` (${issue.id})` : "";
  const userLabel = user.slackId
    ? `<@${user.slackId}>`
    : (user.name ?? user.email ?? "unknown user");

  const text = [
    ":rocket: Task started",
    `Title: ${issue.title}${issueIdText}`,
    `Session ID: ${session.id}`,
    `Issue Provider: ${issue.provider}`,
    `Started by: ${userLabel}`,
    "",
    `Summary: ${initialSummary}`,
  ].join("\n");

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "✅ 完了",
          },
          style: "primary",
          value: session.id,
          action_id: "complete_task",
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "⚠️ ブロッキング報告",
          },
          style: "danger",
          value: session.id,
          action_id: "report_blocked",
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "⏸️ 休止",
          },
          value: session.id,
          action_id: "pause_task",
        },
      ],
    },
  ];

  return { text, blocks };
}

/**
 * タスク更新メッセージを構築
 */
export function buildTaskUpdateMessage(params: {
  summary: string;
}): SlackMessage {
  const text = [
    ":arrow_forward: Progress update",
    `Summary: ${params.summary}`,
  ].join("\n");

  return { text };
}

/**
 * タスクブロッキングメッセージを構築
 */
export function buildTaskBlockedMessage(params: {
  session: { id: string };
  reason: string;
  blockReportId: string;
}): SlackMessage {
  const { session, reason, blockReportId } = params;

  const text = [":warning: Task blocked", `Reason: ${reason}`].join("\n");

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "✅ 解決",
          },
          style: "primary",
          value: JSON.stringify({
            taskSessionId: session.id,
            blockReportId,
          }),
          action_id: "resolve_blocked",
        },
      ],
    },
  ];

  return { text, blocks };
}

/**
 * ブロッキング解決メッセージを構築
 */
export function buildBlockResolvedMessage(params: {
  blockReason: string;
}): SlackMessage {
  const text = [
    ":white_check_mark: Block resolved",
    `Previous issue: ${params.blockReason}`,
  ].join("\n");

  return { text };
}

/**
 * タスク休止メッセージを構築
 */
export function buildTaskPausedMessage(params: {
  session: { id: string };
  reason: string;
}): SlackMessage {
  const { session, reason } = params;

  const text = [":pause_button: Task paused", `Reason: ${reason}`].join("\n");

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "▶️ 再開",
          },
          style: "primary",
          value: session.id,
          action_id: "resume_task",
        },
      ],
    },
  ];

  return { text, blocks };
}

/**
 * タスク再開メッセージを構築
 */
export function buildTaskResumedMessage(params: {
  summary: string;
}): SlackMessage {
  const text = [
    ":arrow_forward: Task resumed",
    `Summary: ${params.summary}`,
  ].join("\n");

  return { text };
}

/**
 * タスク完了メッセージを構築
 */
export function buildTaskCompletedMessage(params: {
  summary: string;
}): SlackMessage {
  const text = [
    ":white_check_mark: Task completed",
    `Summary: ${params.summary}`,
  ].join("\n");

  return { text };
}
