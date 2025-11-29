import { and, desc, eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import type { Database } from "../clients/drizzle";
import * as schema from "../db/schema";

type WorkspaceProvider =
  (typeof schema.workspaceProviderEnum.enumValues)[number];

type WorkspaceRepositoryDeps = {
  db: Database;
};

type CreateWorkspaceInput = {
  provider: WorkspaceProvider;
  externalId: string;
  name: string;
  domain?: string | null;
  botUserId?: string | null;
  botAccessToken?: string | null;
  botRefreshToken?: string | null;
  notificationChannelId?: string | null;
  notificationChannelName?: string | null;
  installedAt?: Date | null;
};

type UpdateCredentialsInput = {
  workspaceId: string;
  botUserId?: string | null;
  botAccessToken?: string | null;
  botRefreshToken?: string | null;
  name?: string;
  domain?: string | null;
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

type AddMemberInput = {
  workspaceId: string;
  userId: string;
};

type IsMemberInput = {
  workspaceId: string;
  userId: string;
};

type ListWorkspacesForUserInput = {
  userId: string;
  limit?: number;
};

export const createWorkspaceRepository = ({ db }: WorkspaceRepositoryDeps) => {
  const createWorkspace = async (input: CreateWorkspaceInput) => {
    const [workspace] = await db
      .insert(schema.workspaces)
      .values({
        id: uuidv7(),
        provider: input.provider,
        externalId: input.externalId,
        name: input.name,
        domain: input.domain ?? null,
        botUserId: input.botUserId ?? null,
        botAccessToken: input.botAccessToken ?? null,
        botRefreshToken: input.botRefreshToken ?? null,
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

  const listWorkspacesForUser = async (input: ListWorkspacesForUserInput) => {
    const limit = input.limit ?? 50;

    return db
      .select({
        workspace: schema.workspaces,
        membership: schema.workspaceMembers,
      })
      .from(schema.workspaces)
      .innerJoin(
        schema.workspaceMembers,
        and(
          eq(schema.workspaceMembers.workspaceId, schema.workspaces.id),
          eq(schema.workspaceMembers.userId, input.userId),
        ),
      )
      .orderBy(desc(schema.workspaces.createdAt))
      .limit(limit);
  };

  const addMember = async (input: AddMemberInput) => {
    const [membership] = await db
      .insert(schema.workspaceMembers)
      .values({
        id: uuidv7(),
        workspaceId: input.workspaceId,
        userId: input.userId,
      })
      .onConflictDoNothing({
        target: [
          schema.workspaceMembers.workspaceId,
          schema.workspaceMembers.userId,
        ],
      })
      .returning();

    return membership ?? null;
  };

  const isMember = async (input: IsMemberInput) => {
    const [membership] = await db
      .select()
      .from(schema.workspaceMembers)
      .where(
        and(
          eq(schema.workspaceMembers.workspaceId, input.workspaceId),
          eq(schema.workspaceMembers.userId, input.userId),
        ),
      )
      .limit(1);

    return Boolean(membership);
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

    if (input.name !== undefined) {
      updates.name = input.name;
    }

    if (input.domain !== undefined) {
      updates.domain = input.domain;
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
    listWorkspacesForUser,
    updateWorkspaceCredentials,
    updateNotificationChannel,
    addMember,
    isMember,
  };
};

export type WorkspaceRepository = ReturnType<typeof createWorkspaceRepository>;
export type {
  CreateWorkspaceInput,
  UpdateCredentialsInput,
  FindByExternalIdInput,
  UpdateNotificationChannelInput,
  AddMemberInput,
  IsMemberInput,
  ListWorkspacesForUserInput,
};
