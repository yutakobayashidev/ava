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

const joinLines = (...lines: Array<string | null | undefined>) =>
  lines.filter((line) => line !== null && line !== undefined).join("\n");

const button = ({ label, actionId, value, style }: ButtonParams) => ({
  type: "button",
  text: { type: "plain_text", text: label },
  action_id: actionId,
  value,
  ...(style ? { style } : {}),
});

const section = (text: string) => ({
  type: "section" as const,
  text: { type: "mrkdwn" as const, text },
});

const actions = (elements: unknown[]) => ({
  type: "actions" as const,
  elements,
});

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

export function buildTaskStartedMessage(params: {
  session: SessionRef;
  issue: IssueRef;
  initialSummary: string;
  user: UserRef;
}): SlackMessage {
  const { session, issue, initialSummary, user } = params;
  const { title, provider } = formatIssue(issue);
  const userLabel = formatUser(user);

  const text = joinLines(
    ":rocket: Task started",
    `Title: ${title}`,
    `Session ID: ${session.id}`,
    `Issue Provider: ${provider}`,
    `Started by: ${userLabel}`,
    "",
    `Summary: ${initialSummary}`,
  );

  const blocks = [
    section(text),
    actions([
      button({
        label: "✅ 完了",
        actionId: "complete_task",
        value: session.id,
        style: "primary",
      }),
      button({
        label: "⚠️ ブロッキング報告",
        actionId: "report_blocked",
        value: session.id,
        style: "danger",
      }),
      button({
        label: "⏸️ 休止",
        actionId: "pause_task",
        value: session.id,
      }),
    ]),
  ];

  return { text, blocks };
}

export function buildTaskUpdateMessage(params: {
  summary: string;
}): SlackMessage {
  const text = joinLines(
    ":arrow_forward: Progress update",
    `Summary: ${params.summary}`,
  );
  return { text };
}

export function buildTaskBlockedMessage(params: {
  session: SessionRef;
  reason: string;
  blockReportId: string;
}): SlackMessage {
  const { session, reason, blockReportId } = params;

  const text = joinLines(":warning: Task blocked", `Reason: ${reason}`);
  const blocks = [
    section(text),
    actions([
      button({
        label: "✅ 解決",
        actionId: "resolve_blocked",
        style: "primary",
        value: JSON.stringify({
          taskSessionId: session.id,
          blockReportId,
        }),
      }),
    ]),
  ];

  return { text, blocks };
}

export function buildBlockResolvedMessage(params: {
  blockReason: string;
}): SlackMessage {
  const text = joinLines(
    ":white_check_mark: Block resolved",
    `Previous issue: ${params.blockReason}`,
  );
  return { text };
}

export function buildTaskPausedMessage(params: {
  session: SessionRef;
  reason: string;
}): SlackMessage {
  const { session, reason } = params;

  const text = joinLines(":pause_button: Task paused", `Reason: ${reason}`);
  const blocks = [
    section(text),
    actions([
      button({
        label: "▶️ 再開",
        actionId: "resume_task",
        style: "primary",
        value: session.id,
      }),
    ]),
  ];

  return { text, blocks };
}

export function buildTaskResumedMessage(params: {
  summary: string;
}): SlackMessage {
  const text = joinLines(
    ":arrow_forward: Task resumed",
    `Summary: ${params.summary}`,
  );
  return { text };
}

export function buildTaskCompletedMessage(params: {
  summary: string;
}): SlackMessage {
  const text = joinLines(
    ":white_check_mark: Task completed",
    `Summary: ${params.summary}`,
  );
  return { text };
}
