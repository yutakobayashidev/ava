import { postMessage, addReaction } from "../clients/slack";
import { db } from "../clients/drizzle";
import * as schema from "../db/schema";
import { createWorkspaceRepository, createTaskRepository } from "../repos";

type IssueProvider = (typeof schema.issueProviderEnum.enumValues)[number];

type NotifyTaskStartedParams = {
    sessionId: string;
    workspaceId: string;
    issueTitle: string;
    issueProvider: IssueProvider;
    issueId?: string | null;
    initialSummary: string;
    userName?: string | null;
    userEmail?: string | null;
};

type NotifyTaskBlockedParams = {
    sessionId: string;
    workspaceId: string;
    reason: string;
};

type NotifyTaskCompletedParams = {
    sessionId: string;
    workspaceId: string;
    summary: string;
    prUrl: string;
};

type NotifyTaskUpdateParams = {
    sessionId: string;
    workspaceId: string;
    summary: string;
};

type NotifyBlockResolvedParams = {
    sessionId: string;
    workspaceId: string;
    blockReason: string;
};

type SlackNotificationResult = {
    delivered: boolean;
    channel?: string;
    threadTs?: string;
    workspaceId?: string;
    source?: "workspace";
    reason?: "missing_config" | "api_error";
    error?: string;
};

type SlackConfig = {
    token: string;
    channel: string;
    workspaceId: string;
};

const resolveSlackConfig = async (workspaceId: string): Promise<SlackConfig | null> => {
    const workspaceRepository = createWorkspaceRepository({ db });
    const workspace = await workspaceRepository.findWorkspaceById(workspaceId);

    if (workspace?.botAccessToken && workspace.notificationChannelId) {
        return {
            token: workspace.botAccessToken,
            channel: workspace.notificationChannelId,
            workspaceId: workspace.id,
        };
    }

    return null;
};

export const notifyTaskStarted = async (
    params: NotifyTaskStartedParams,
): Promise<SlackNotificationResult> => {
    const config = await resolveSlackConfig(params.workspaceId);

    if (!config) {
        return {
            delivered: false,
            reason: "missing_config",
        };
    }

    const issueIdText = params.issueId ? ` (${params.issueId})` : "";
    const userLabel = params.userName ?? params.userEmail ?? "unknown user";

    const text = [
        ":rocket: Task started",
        `Title: ${params.issueTitle}${issueIdText}`,
        `Session ID: ${params.sessionId}`,
        `Issue Provider: ${params.issueProvider}`,
        `Started by: ${userLabel}`,
        "",
        `Summary: ${params.initialSummary}`,
    ].join("\n");

    try {
        const result = await postMessage({
            token: config.token,
            channel: config.channel,
            text,
        });

        // Save thread info to database
        if (result.ts && result.channel) {
            const taskRepository = createTaskRepository({ db });
            await taskRepository.updateSlackThread({
                taskSessionId: params.sessionId,
                workspaceId: params.workspaceId,
                threadTs: result.ts,
                channel: result.channel,
            });
        }

        return {
            delivered: true,
            channel: result.channel,
            threadTs: result.ts,
            workspaceId: config.workspaceId,
            source: "workspace",
        };
    } catch (error) {
        console.error("Failed to post Slack notification", error);
        return {
            delivered: false,
            reason: "api_error",
            error: error instanceof Error ? error.message : "unknown_error",
        };
    }
};

export const notifyTaskBlocked = async (
    params: NotifyTaskBlockedParams,
): Promise<SlackNotificationResult> => {
    const config = await resolveSlackConfig(params.workspaceId);

    if (!config) {
        return {
            delivered: false,
            reason: "missing_config",
        };
    }

    // Get task session to retrieve thread info
    const taskRepository = createTaskRepository({ db });
    const session = await taskRepository.findTaskSessionById(
        params.sessionId,
        params.workspaceId,
    );

    if (!session) {
        return {
            delivered: false,
            reason: "api_error",
            error: "Task session not found",
        };
    }

    if (!session.slackThreadTs || !session.slackChannel) {
        return {
            delivered: false,
            reason: "api_error",
            error: "No Slack thread found for this task",
        };
    }

    const text = [
        ":warning: Task blocked",
        `Reason: ${params.reason}`,
    ].join("\n");

    try {
        const result = await postMessage({
            token: config.token,
            channel: session.slackChannel,
            text,
            threadTs: session.slackThreadTs,
        });

        return {
            delivered: true,
            channel: result.channel,
            threadTs: result.ts,
            workspaceId: config.workspaceId,
            source: "workspace",
        };
    } catch (error) {
        console.error("Failed to post Slack notification", error);
        return {
            delivered: false,
            reason: "api_error",
            error: error instanceof Error ? error.message : "unknown_error",
        };
    }
};

export const notifyTaskUpdate = async (
    params: NotifyTaskUpdateParams,
): Promise<SlackNotificationResult> => {
    const config = await resolveSlackConfig(params.workspaceId);

    if (!config) {
        return {
            delivered: false,
            reason: "missing_config",
        };
    }

    // Get task session to retrieve thread info
    const taskRepository = createTaskRepository({ db });
    const session = await taskRepository.findTaskSessionById(
        params.sessionId,
        params.workspaceId,
    );

    if (!session) {
        return {
            delivered: false,
            reason: "api_error",
            error: "Task session not found",
        };
    }

    if (!session.slackThreadTs || !session.slackChannel) {
        return {
            delivered: false,
            reason: "api_error",
            error: "No Slack thread found for this task",
        };
    }

    const text = [
        ":arrow_forward: Progress update",
        `Summary: ${params.summary}`,
    ].join("\n");

    try {
        const result = await postMessage({
            token: config.token,
            channel: session.slackChannel,
            text,
            threadTs: session.slackThreadTs,
        });

        return {
            delivered: true,
            channel: result.channel,
            threadTs: result.ts,
            workspaceId: config.workspaceId,
            source: "workspace",
        };
    } catch (error) {
        console.error("Failed to post Slack notification", error);
        return {
            delivered: false,
            reason: "api_error",
            error: error instanceof Error ? error.message : "unknown_error",
        };
    }
};

export const notifyBlockResolved = async (
    params: NotifyBlockResolvedParams,
): Promise<SlackNotificationResult> => {
    const config = await resolveSlackConfig(params.workspaceId);

    if (!config) {
        return {
            delivered: false,
            reason: "missing_config",
        };
    }

    // Get task session to retrieve thread info
    const taskRepository = createTaskRepository({ db });
    const session = await taskRepository.findTaskSessionById(
        params.sessionId,
        params.workspaceId,
    );

    if (!session) {
        return {
            delivered: false,
            reason: "api_error",
            error: "Task session not found",
        };
    }

    if (!session.slackThreadTs || !session.slackChannel) {
        return {
            delivered: false,
            reason: "api_error",
            error: "No Slack thread found for this task",
        };
    }

    const text = [
        ":white_check_mark: Block resolved",
        `Previous issue: ${params.blockReason}`,
    ].join("\n");

    try {
        const result = await postMessage({
            token: config.token,
            channel: session.slackChannel,
            text,
            threadTs: session.slackThreadTs,
        });

        return {
            delivered: true,
            channel: result.channel,
            threadTs: result.ts,
            workspaceId: config.workspaceId,
            source: "workspace",
        };
    } catch (error) {
        console.error("Failed to post Slack notification", error);
        return {
            delivered: false,
            reason: "api_error",
            error: error instanceof Error ? error.message : "unknown_error",
        };
    }
};

export const notifyTaskCompleted = async (
    params: NotifyTaskCompletedParams,
): Promise<SlackNotificationResult> => {
    const config = await resolveSlackConfig(params.workspaceId);

    if (!config) {
        return {
            delivered: false,
            reason: "missing_config",
        };
    }

    // Get task session to retrieve thread info
    const taskRepository = createTaskRepository({ db });
    const session = await taskRepository.findTaskSessionById(
        params.sessionId,
        params.workspaceId,
    );

    if (!session) {
        return {
            delivered: false,
            reason: "api_error",
            error: "Task session not found",
        };
    }

    if (!session.slackThreadTs || !session.slackChannel) {
        return {
            delivered: false,
            reason: "api_error",
            error: "No Slack thread found for this task",
        };
    }

    const text = [
        ":white_check_mark: Task completed",
        `Summary: ${params.summary}`,
        `PR: ${params.prUrl}`,
    ].join("\n");

    try {
        const result = await postMessage({
            token: config.token,
            channel: session.slackChannel,
            text,
            threadTs: session.slackThreadTs,
        });

        // Add completion reaction to the thread's first message
        try {
            await addReaction({
                token: config.token,
                channel: session.slackChannel,
                timestamp: session.slackThreadTs,
                name: "white_check_mark",
            });
        } catch (reactionError) {
            // Log error but don't fail the entire operation
            console.error("Failed to add reaction to completed task", reactionError);
        }

        return {
            delivered: true,
            channel: result.channel,
            threadTs: result.ts,
            workspaceId: config.workspaceId,
            source: "workspace",
        };
    } catch (error) {
        console.error("Failed to post Slack notification", error);
        return {
            delivered: false,
            reason: "api_error",
            error: error instanceof Error ? error.message : "unknown_error",
        };
    }
};
