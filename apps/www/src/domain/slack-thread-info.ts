/**
 * Slack スレッド情報の Value Object
 * セッションに紐づくSlackスレッドの情報を型安全に扱う
 */
type SlackThreadInfo = {
  readonly channel: string;
  readonly threadTs: string;
};

/**
 * Slack スレッド情報を作成する
 * channel と threadTs の両方が存在する場合のみ成功する
 */
export function createSlackThreadInfo(params: {
  channel: string | null;
  threadTs: string | null;
}): SlackThreadInfo | null {
  if (!params.channel || !params.threadTs) {
    return null;
  }

  return {
    channel: params.channel,
    threadTs: params.threadTs,
  };
}
