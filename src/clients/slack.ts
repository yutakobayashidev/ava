type PostMessageParams = {
    token: string;
    channel: string;
    text: string;
    threadTs?: string;
};

type SlackConversation = {
    id: string;
    name: string;
    is_private?: boolean;
    is_archived?: boolean;
};

type SlackPostMessageResponse = {
    ok: boolean;
    channel?: string;
    ts?: string;
    error?: string;
};

type SlackConversationsListResponse = {
    ok: boolean;
    channels?: SlackConversation[];
    response_metadata?: {
        next_cursor?: string;
    };
    error?: string;
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
    const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            channel,
            text,
            thread_ts: threadTs,
        }),
    });

    const payload = (await response.json()) as SlackPostMessageResponse;

    if (!response.ok || !payload.ok) {
        const message = payload.error ?? response.statusText;
        throw new Error(`Slack API error: ${message}`);
    }

    return {
        channel: payload.channel ?? channel,
        ts: payload.ts,
    };
};

export const listChannels = async (token: string): Promise<SlackChannel[]> => {
    const channels: SlackChannel[] = [];
    let cursor: string | undefined;

    do {
        const url = new URL("https://slack.com/api/conversations.list");
        url.searchParams.set("limit", "200");
        url.searchParams.set("types", "public_channel,private_channel");
        if (cursor) {
            url.searchParams.set("cursor", cursor);
        }

        const response = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });

        const payload = (await response.json()) as SlackConversationsListResponse;

        if (!response.ok || !payload.ok) {
            const message = payload.error ?? response.statusText;
            throw new Error(`Slack API error: ${message}`);
        }

        channels.push(
            ...(payload.channels ?? [])
                .filter((channel) => !channel.is_archived)
                .map((channel) => ({
                    id: channel.id,
                    name: channel.name,
                    isPrivate: channel.is_private ?? false,
                })),
        );

        cursor = payload.response_metadata?.next_cursor || undefined;
        if (cursor === "") {
            cursor = undefined;
        }
    } while (cursor);

    return channels;
};
