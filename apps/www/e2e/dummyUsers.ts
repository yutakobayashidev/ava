import type { User, Workspace } from "@ava/database/schema";
import type { CreateWorkspaceRequest } from "@/repos/workspaces";

type RemoveNullish<T> = {
  [K in keyof T]-?: NonNullable<T[K]>;
};

export type NonNullableUser = RemoveNullish<User>;
export type NonNullableWorkspace = RemoveNullish<Workspace>;

export const user1: NonNullableUser = {
  id: "john_doe",
  name: "John Doe",
  email: "john@example.com",
  slackId: "U01234ABCDE",
  slackTeamId: "T01234ABCDE",
  workspaceId: "workspace1",
  image: "https://example.com/avatar.jpg",
  stripeId: "cus_test123",
  onboardingCompletedAt: new Date("2024-01-01T00:00:00Z"),
  createdAt: new Date("2024-01-01T00:00:00Z"),
};

export const workspace1: CreateWorkspaceRequest = {
  provider: "slack",
  externalId: "T01234ABCDE",
  name: "Test Workspace",
  domain: "test.slack.com",
  botUserId: "B01234ABCDE",
  botAccessToken: "xoxb-test-token",
  notificationChannelId: "C01234ABCDE",
  notificationChannelName: "general",
  installedAt: new Date("2024-01-01T00:00:00Z"),
};
