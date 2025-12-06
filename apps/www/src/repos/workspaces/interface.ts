import type * as schema from "@ava/database/schema";

export type WorkspaceProvider =
  (typeof schema.workspaceProviderEnum.enumValues)[number];

export type CreateWorkspaceRequest = {
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

export type UpdateCredentialsRequest = {
  workspaceId: string;
  botUserId?: string | null;
  botAccessToken?: string | null;
  botRefreshToken?: string | null;
  botTokenExpiresAt?: Date | null;
  name?: string;
  domain?: string | null;
  iconUrl?: string | null;
};

export type UpdateNotificationChannelRequest = {
  workspaceId: string;
  channelId: string;
  channelName?: string | null;
};

export type FindByExternalIdRequest = {
  provider: WorkspaceProvider;
  externalId: string;
};

export type WorkspaceRepository = {
  createWorkspace: (
    request: CreateWorkspaceRequest,
  ) => Promise<schema.Workspace>;
  findWorkspaceById: (workspaceId: string) => Promise<schema.Workspace | null>;
  findWorkspaceByExternalId: (
    request: FindByExternalIdRequest,
  ) => Promise<schema.Workspace | null>;
  findWorkspaceByUser: (userId: string) => Promise<schema.Workspace | null>;
  setUserWorkspace: (userId: string, workspaceId: string) => Promise<void>;
  setWorkspaceForAllTeamUsers: (
    slackTeamId: string,
    workspaceId: string,
  ) => Promise<void>;
  updateWorkspaceCredentials: (
    request: UpdateCredentialsRequest,
  ) => Promise<schema.Workspace | null>;
  updateNotificationChannel: (
    request: UpdateNotificationChannelRequest,
  ) => Promise<schema.Workspace | null>;
};
