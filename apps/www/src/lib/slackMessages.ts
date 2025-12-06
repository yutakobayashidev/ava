type SlackStatusParams = {
  installed?: string;
  team?: string;
  error?: string;
  success?: string;
};

export function getSlackStatusMessage(
  params: SlackStatusParams,
): string | null {
  // 成功メッセージ
  if (params.installed === "1") {
    return `Slackワークスペースを連携しました (${params.team ?? "workspace"})`;
  }
  if (params.success === "channel_updated") {
    return "通知チャンネルを変更しました";
  }

  // エラーメッセージ
  if (params.error === "missing_code") {
    return "エラー: 認証コードが見つかりませんでした";
  }
  if (params.error === "state_mismatch") {
    return "エラー: 認証状態が一致しません。もう一度お試しください";
  }
  if (params.error === "invalid_channel") {
    return "エラー: 選択したチャンネルが見つかりませんでした";
  }
  if (params.error === "missing_channel") {
    return "エラー: チャンネルを選択してください";
  }
  if (params.error === "channel_fetch_failed") {
    return "エラー: チャンネル一覧の取得に失敗しました";
  }
  if (params.error === "team_mismatch") {
    return "エラー: ログイン中のワークスペースとは異なるワークスペースにボットをインストールしようとしています。ログイン中のワークスペースにボットをインストールしてください。";
  }
  if (params.error) {
    return `エラー: ${params.error}`;
  }

  return null;
}

export function isSuccessMessage(params: SlackStatusParams): boolean {
  return params.installed === "1" || params.success === "channel_updated";
}
