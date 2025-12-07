import { and, eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import type { Database } from "@ava/database/client";
import * as schema from "@ava/database/schema";
import type {
  CreateWorkspaceRequest,
  FindByExternalIdRequest,
  UpdateCredentialsRequest,
  UpdateNotificationChannelRequest,
  WorkspaceRepository,
} from "./interface";

export * from "./interface";

// 高階関数として定義
const createWorkspace =
  (db: Database) => async (request: CreateWorkspaceRequest) => {
    const [workspace] = await db
      .insert(schema.workspaces)
      .values({
        id: uuidv7(),
        provider: request.provider,
        externalId: request.externalId,
        name: request.name,
        domain: request.domain ?? null,
        iconUrl: request.iconUrl ?? null,
        botUserId: request.botUserId ?? null,
        botAccessToken: request.botAccessToken ?? null,
        botRefreshToken: request.botRefreshToken ?? null,
        botTokenExpiresAt: request.botTokenExpiresAt ?? null,
        notificationChannelId: request.notificationChannelId ?? null,
        notificationChannelName: request.notificationChannelName ?? null,
        installedAt: request.installedAt ?? new Date(),
      })
      .returning();

    return workspace;
  };

const findWorkspaceById = (db: Database) => async (workspaceId: string) => {
  const [workspace] = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId));

  return workspace ?? null;
};

const updateNotificationChannel =
  (db: Database) => async (request: UpdateNotificationChannelRequest) => {
    const [workspace] = await db
      .update(schema.workspaces)
      .set({
        notificationChannelId: request.channelId,
        notificationChannelName: request.channelName ?? null,
      })
      .where(eq(schema.workspaces.id, request.workspaceId))
      .returning();

    return workspace ?? null;
  };

const findWorkspaceByExternalId =
  (db: Database) =>
  async ({ provider, externalId }: FindByExternalIdRequest) => {
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

const findWorkspaceByUser = (db: Database) => async (userId: string) => {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId));

  if (!user?.workspaceId) {
    return null;
  }

  return findWorkspaceById(db)(user.workspaceId);
};

const setUserWorkspace =
  (db: Database) => async (userId: string, workspaceId: string) => {
    await db
      .update(schema.users)
      .set({ workspaceId })
      .where(eq(schema.users.id, userId));
  };

const setWorkspaceForAllTeamUsers =
  (db: Database) => async (slackTeamId: string, workspaceId: string) => {
    await db
      .update(schema.users)
      .set({ workspaceId })
      .where(eq(schema.users.slackTeamId, slackTeamId));
  };

const updateWorkspaceCredentials =
  (db: Database) => async (request: UpdateCredentialsRequest) => {
    const updates: Partial<schema.NewWorkspace> = {};

    if (request.botUserId !== undefined) {
      updates.botUserId = request.botUserId;
    }

    if (request.botAccessToken !== undefined) {
      updates.botAccessToken = request.botAccessToken;
    }

    if (request.botRefreshToken !== undefined) {
      updates.botRefreshToken = request.botRefreshToken;
    }

    if (request.botTokenExpiresAt !== undefined) {
      updates.botTokenExpiresAt = request.botTokenExpiresAt;
    }

    if (request.name !== undefined) {
      updates.name = request.name;
    }

    if (request.domain !== undefined) {
      updates.domain = request.domain;
    }

    if (request.iconUrl !== undefined) {
      updates.iconUrl = request.iconUrl;
    }

    if (Object.keys(updates).length === 0) {
      return findWorkspaceById(db)(request.workspaceId);
    }

    const [workspace] = await db
      .update(schema.workspaces)
      .set(updates)
      .where(eq(schema.workspaces.id, request.workspaceId))
      .returning();

    return workspace ?? null;
  };

export const createWorkspaceRepository = (
  db: Database,
): WorkspaceRepository => ({
  createWorkspace: createWorkspace(db),
  findWorkspaceById: findWorkspaceById(db),
  findWorkspaceByExternalId: findWorkspaceByExternalId(db),
  findWorkspaceByUser: findWorkspaceByUser(db),
  setUserWorkspace: setUserWorkspace(db),
  setWorkspaceForAllTeamUsers: setWorkspaceForAllTeamUsers(db),
  updateWorkspaceCredentials: updateWorkspaceCredentials(db),
  updateNotificationChannel: updateNotificationChannel(db),
});
