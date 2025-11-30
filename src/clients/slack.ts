import "server-only";

import { WebClient } from "@slack/web-api";

type PostMessageParams = {
  token: string;
  channel: string;
  text: string;
  threadTs?: string;
};

type AddReactionParams = {
  token: string;
  channel: string;
  timestamp: string;
  name: string;
};

export type SlackChannel = {
  id: string;
  name: string;
  isPrivate: boolean;
};

export const postMessage = async ({
  token,
  channel,
  text,
  threadTs,
}: PostMessageParams) => {
  const client = new WebClient(token);

  const result = await client.chat.postMessage({
    channel,
    text,
    thread_ts: threadTs,
  });

  if (!result.ok) {
    throw new Error(`Slack API error: ${result.error || "Unknown error"}`);
  }

  return {
    channel: result.channel ?? channel,
    ts: result.ts,
  };
};

export const listChannels = async (token: string): Promise<SlackChannel[]> => {
  const client = new WebClient(token);
  const channels: SlackChannel[] = [];
  let cursor: string | undefined;

  do {
    const result = await client.conversations.list({
      limit: 200,
      types: "public_channel,private_channel",
      cursor,
    });

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error || "Unknown error"}`);
    }

    if (result.channels) {
      channels.push(
        ...result.channels
          .filter((channel) => !channel.is_archived)
          .map((channel) => ({
            id: channel.id!,
            name: channel.name!,
            isPrivate: channel.is_private ?? false,
          })),
      );
    }

    cursor = result.response_metadata?.next_cursor || undefined;
    if (cursor === "") {
      cursor = undefined;
    }
  } while (cursor);

  return channels;
};

export const addReaction = async ({
  token,
  channel,
  timestamp,
  name,
}: AddReactionParams) => {
  const client = new WebClient(token);

  try {
    const result = await client.reactions.add({
      channel,
      timestamp,
      name,
    });

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error || "Unknown error"}`);
    }

    return { success: true };
  } catch (error) {
    // already_reacted エラーは無視する（既にリアクションが追加されている場合）
    if (error instanceof Error && error.message.includes("already_reacted")) {
      return { success: true };
    }
    throw error;
  }
};

export const getTeamIcon = async (token: string): Promise<string | null> => {
  const client = new WebClient(token);

  try {
    const result = await client.team.info();

    if (!result.ok || !result.team) {
      console.warn("Failed to fetch team info from Slack");
      return null;
    }

    const icon = result.team.icon;
    if (!icon) {
      return null;
    }

    // 利用可能な最大サイズのアイコンを返す
    return (
      icon.image_original ??
      icon.image_230 ??
      icon.image_132 ??
      icon.image_102 ??
      icon.image_88 ??
      icon.image_68 ??
      null
    );
  } catch (error) {
    console.warn("Failed to fetch team icon:", error);
    return null;
  }
};
