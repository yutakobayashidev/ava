import type { SlackMessage } from "@/services/slackNotificationService";

type SessionRef = { id: string };
type IssueRef = {
  title: string;
  provider: string;
  id?: string | null;
};
type UserRef = {
  name?: string | null;
  email?: string | null;
  slackId?: string | null;
};

type ButtonStyle = "primary" | "danger" | undefined;

type ButtonParams = {
  label: string;
  actionId: string;
  value: string;
  style?: ButtonStyle;
};

const button = ({ label, actionId, value, style }: ButtonParams) => ({
  type: "button",
  text: { type: "plain_text", text: label },
  action_id: actionId,
  value,
  ...(style ? { style } : {}),
});

const section = (text: string) => ({
  type: "section" as const,
  text: { type: "mrkdwn", text },
});

const actions = (elements: unknown[]) => ({
  type: "actions" as const,
  elements,
});

// ---------- formatting helpers ----------

const formatUser = (user: UserRef) => {
  if (user.slackId) return `<@${user.slackId}>`;
  return user.name ?? user.email ?? "unknown user";
};

const formatIssue = (issue: IssueRef) => {
  const issueIdText = issue.id ? ` (${issue.id})` : "";
  return {
    title: `${issue.title}${issueIdText}`,
    provider: issue.provider,
  };
};

// ---------- message builders ----------

export function buildTaskStartedMessage(params: {
  session: SessionRef;
  issue: IssueRef;
  initialSummary: string;
  user: UserRef;
}): SlackMessage {
  const { session, issue, initialSummary, user } = params;
  const { title, provider } = formatIssue(issue);
  const userLabel = formatUser(user);

  const blocks = [
    section("*Task started :rocket:*"),

    section(
      `*Title*\n${title}\n\n` +
        `*Started by*\n${userLabel}\n\n` +
        `*Session ID*\n\`${session.id}\`\n\n` +
        `*Issue Provider*\n${provider}`,
    ),

    section(`*Summary*\n${initialSummary}`),

    actions([
      button({
        label: "完了",
        actionId: "complete_task",
        value: session.id,
        style: "primary",
      }),
      button({
        label: "ブロッキング報告",
        actionId: "report_blocked",
        value: session.id,
        style: "danger",
      }),
      button({
        label: "休止",
        actionId: "pause_task",
        value: session.id,
      }),
    ]),
  ];

  return {
    text: `Task started: ${title}`,
    blocks,
  };
}

export function buildTaskUpdateMessage(params: {
  summary: string;
}): SlackMessage {
  return {
    text: `Progress update: ${params.summary}`,
    blocks: [
      section("*Progress update :arrow_forward:*"),
      section(`*Summary*\n${params.summary}`),
    ],
  };
}

export function buildTaskBlockedMessage(params: {
  session: SessionRef;
  reason: string;
  blockReportId: string;
}): SlackMessage {
  const { session, reason, blockReportId } = params;

  const blocks = [
    section("*Task blocked :warning:*"),
    section(`*Reason*\n${reason}`),

    actions([
      button({
        label: "解決",
        actionId: "resolve_blocked",
        value: JSON.stringify({
          taskSessionId: session.id,
          blockReportId,
        }),
        style: "primary",
      }),
    ]),
  ];

  return {
    text: `Task blocked: ${reason}`,
    blocks,
  };
}

export function buildBlockResolvedMessage(params: {
  blockReason: string;
}): SlackMessage {
  return {
    text: `Block resolved: ${params.blockReason}`,
    blocks: [
      section("*Block resolved :white_check_mark:*"),
      section(`*Previous issue*\n${params.blockReason}`),
    ],
  };
}

export function buildTaskPausedMessage(params: {
  session: SessionRef;
  reason: string;
}): SlackMessage {
  const { session, reason } = params;

  const blocks = [
    section("*Task paused :double_vertical_bar:*"),
    section(`*Reason*\n${reason}`),

    actions([
      button({
        label: "再開",
        actionId: "resume_task",
        value: session.id,
        style: "primary",
      }),
    ]),
  ];

  return {
    text: `Task paused: ${reason}`,
    blocks,
  };
}

export function buildTaskResumedMessage(params: {
  summary: string;
}): SlackMessage {
  return {
    text: `Task resumed: ${params.summary}`,
    blocks: [
      section("*Task resumed :arrow_forward:*"),
      section(`*Summary*\n${params.summary}`),
    ],
  };
}

export function buildTaskCompletedMessage(params: {
  summary: string;
}): SlackMessage {
  return {
    text: `Task completed: ${params.summary}`,
    blocks: [
      section("*Task completed :white_check_mark:*"),
      section(`*Summary*\n${params.summary}`),
    ],
  };
}

export function buildTaskCancelledMessage(params: {
  reason?: string | null;
}): SlackMessage {
  const { reason } = params;
  const blocks = [section("*Task cancelled :x:*")];

  if (reason) {
    blocks.push(section(`*Reason*\n${reason}`));
  }

  return {
    text: `Task cancelled${reason ? `: ${reason}` : ""}`,
    blocks,
  };
}
