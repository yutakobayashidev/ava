import { and, eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import type { Database } from "@ava/database/client";
import * as schema from "@ava/database/schema";

type WorkspaceProvider =
  (typeof schema.workspaceProviderEnum.enumValues)[number];

type CreateWorkspaceInput = {
  provider: WorkspaceProvider;
  externalId: string;
  name: string;
  domain?: string | null;
  iconUrl?: string | null;
  botUserId?: string | null;
  botAccessToken?: string | null;
  botRefreshToken?: string | null;
  botTokenExpiresAt?: Date | null;
  notificationChannelId?: string | null;
  notificationChannelName?: string | null;
  installedAt?: Date | null;
};

type UpdateCredentialsInput = {
  workspaceId: string;
  botUserId?: string | null;
  botAccessToken?: string | null;
  botRefreshToken?: string | null;
  botTokenExpiresAt?: Date | null;
  name?: string;
  domain?: string | null;
  iconUrl?: string | null;
};

type UpdateNotificationChannelInput = {
  workspaceId: string;
  channelId: string;
  channelName?: string | null;
};

type FindByExternalIdInput = {
  provider: WorkspaceProvider;
  externalId: string;
};

// AddMemberInput, IsMemberInput, ListWorkspacesForUserInput は削除
// workspace_members テーブルが不要になったため

export const createWorkspaceRepository = (db: Database) => {
  const createWorkspace = async (input: CreateWorkspaceInput) => {
    const [workspace] = await db
      .insert(schema.workspaces)
      .values({
        id: uuidv7(),
        provider: input.provider,
        externalId: input.externalId,
        name: input.name,
        domain: input.domain ?? null,
        iconUrl: input.iconUrl ?? null,
        botUserId: input.botUserId ?? null,
        botAccessToken: input.botAccessToken ?? null,
        botRefreshToken: input.botRefreshToken ?? null,
        botTokenExpiresAt: input.botTokenExpiresAt ?? null,
        notificationChannelId: input.notificationChannelId ?? null,
        notificationChannelName: input.notificationChannelName ?? null,
        installedAt: input.installedAt ?? new Date(),
      })
      .returning();

    return workspace;
  };

  const findWorkspaceById = async (workspaceId: string) => {
    const [workspace] = await db
      .select()
      .from(schema.workspaces)
      .where(eq(schema.workspaces.id, workspaceId));

    return workspace ?? null;
  };

  const updateNotificationChannel = async (
    input: UpdateNotificationChannelInput,
  ) => {
    const [workspace] = await db
      .update(schema.workspaces)
      .set({
        notificationChannelId: input.channelId,
        notificationChannelName: input.channelName ?? null,
      })
      .where(eq(schema.workspaces.id, input.workspaceId))
      .returning();

    return workspace ?? null;
  };

  const findWorkspaceByExternalId = async ({
    provider,
    externalId,
  }: FindByExternalIdInput) => {
    const [workspace] = await db
      .select()
      .from(schema.workspaces)
      .where(
        and(
          eq(schema.workspaces.provider, provider),
          eq(schema.workspaces.externalId, externalId),
        ),
      );

    return workspace ?? null;
  };

  const findWorkspaceByUser = async (userId: string) => {
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId));

    if (!user?.workspaceId) {
      return null;
    }

    return findWorkspaceById(user.workspaceId);
  };

  const setUserWorkspace = async (userId: string, workspaceId: string) => {
    await db
      .update(schema.users)
      .set({ workspaceId })
      .where(eq(schema.users.id, userId));
  };

  const setWorkspaceForAllTeamUsers = async (
    slackTeamId: string,
    workspaceId: string,
  ) => {
    await db
      .update(schema.users)
      .set({ workspaceId })
      .where(eq(schema.users.slackTeamId, slackTeamId));
  };

  const updateWorkspaceCredentials = async (input: UpdateCredentialsInput) => {
    const updates: Partial<schema.NewWorkspace> = {};

    if (input.botUserId !== undefined) {
      updates.botUserId = input.botUserId;
    }

    if (input.botAccessToken !== undefined) {
      updates.botAccessToken = input.botAccessToken;
    }

    if (input.botRefreshToken !== undefined) {
      updates.botRefreshToken = input.botRefreshToken;
    }

    if (input.botTokenExpiresAt !== undefined) {
      updates.botTokenExpiresAt = input.botTokenExpiresAt;
    }

    if (input.name !== undefined) {
      updates.name = input.name;
    }

    if (input.domain !== undefined) {
      updates.domain = input.domain;
    }

    if (input.iconUrl !== undefined) {
      updates.iconUrl = input.iconUrl;
    }

    if (Object.keys(updates).length === 0) {
      return findWorkspaceById(input.workspaceId);
    }

    const [workspace] = await db
      .update(schema.workspaces)
      .set(updates)
      .where(eq(schema.workspaces.id, input.workspaceId))
      .returning();

    return workspace ?? null;
  };

  return {
    createWorkspace,
    findWorkspaceById,
    findWorkspaceByExternalId,
    findWorkspaceByUser,
    setUserWorkspace,
    setWorkspaceForAllTeamUsers,
    updateWorkspaceCredentials,
    updateNotificationChannel,
  };
};

export type WorkspaceRepository = ReturnType<typeof createWorkspaceRepository>;
export type { CreateWorkspaceInput };
