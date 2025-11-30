import type { CreateWorkspaceInput } from "@/repos/workspaces";

export class WorkspaceBuilder {
  private workspace: CreateWorkspaceInput;

  constructor(base?: Partial<CreateWorkspaceInput>) {
    this.workspace = {
      provider: "slack",
      externalId: "T01234ABCDE",
      name: "Test Workspace",
      domain: "test.slack.com",
      botUserId: "B01234ABCDE",
      botAccessToken: "xoxb-test-token",
      notificationChannelId: "C01234ABCDE",
      notificationChannelName: "general",
      installedAt: new Date("2024-01-01T00:00:00Z"),
      ...base,
    };
  }

  withoutBotToken(): this {
    this.workspace.botAccessToken = null;
    return this;
  }

  withoutNotificationChannel(): this {
    this.workspace.notificationChannelId = null;
    this.workspace.notificationChannelName = null;
    return this;
  }

  withBotAccessToken(token: string): this {
    this.workspace.botAccessToken = token;
    return this;
  }

  withNotificationChannel(id: string, name: string): this {
    this.workspace.notificationChannelId = id;
    this.workspace.notificationChannelName = name;
    return this;
  }

  build(): CreateWorkspaceInput {
    return this.workspace;
  }
}
