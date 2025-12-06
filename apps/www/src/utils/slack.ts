type SlackThreadUrlParams = {
  workspaceExternalId?: string | null;
  workspaceDomain?: string | null;
  channelId?: string | null;
  threadTs?: string | null;
};

/**
 * Slackのスレッドを開くためのURLを生成する。
 * workspaceExternalId があれば app.slack.com 形式を優先し、
 * ない場合はドメイン形式のパーマリンクを返す。
 */
export function buildSlackThreadUrl(
  params: SlackThreadUrlParams,
): string | null {
  const { workspaceExternalId, workspaceDomain, channelId, threadTs } = params;

  if (!channelId || !threadTs) {
    return null;
  }

  if (workspaceExternalId) {
    const encodedWorkspace = encodeURIComponent(workspaceExternalId);
    const encodedChannel = encodeURIComponent(channelId);
    const encodedThreadTs = encodeURIComponent(threadTs);

    return `https://app.slack.com/client/${encodedWorkspace}/${encodedChannel}/thread/${encodedChannel}-${encodedThreadTs}`;
  }

  if (workspaceDomain) {
    const tsFragment = threadTs.replace(/\./g, "");
    const encodedChannel = encodeURIComponent(channelId);
    const encodedThreadTs = encodeURIComponent(threadTs);
    return `https://${workspaceDomain}.slack.com/archives/${encodedChannel}/p${tsFragment}?thread_ts=${encodedThreadTs}&cid=${encodedChannel}`;
  }

  return null;
}
