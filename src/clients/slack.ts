type PostMessageParams = {
    token: string;
    channel: string;
    text: string;
    threadTs?: string;
};

type SlackPostMessageResponse = {
    ok: boolean;
    channel?: string;
    ts?: string;
    error?: string;
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
