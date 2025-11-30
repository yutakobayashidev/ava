import { afterAll, afterEach, vi } from "vitest";
import { createWorkspaceRepository, createUserRepository } from "@/repos";

export async function setup() {
  const { container, db, truncate, down } = await vi.hoisted(async () => {
    const { setupDB } = await import("./db.setup");

    return await setupDB({ port: "random" });
  });

  const mock = vi.hoisted(() => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
    redirect: vi.fn(),
  }));

  vi.mock("server-only", () => {
    return {};
  });

  vi.mock("@/clients/drizzle", () => ({
    db,
  }));

  vi.mock("next/cache", async (actual) => ({
    ...(await actual<typeof import("next/cache")>()),
    revalidatePath: mock.revalidatePath,
    revalidateTag: mock.revalidateTag,
  }));

  vi.mock("next/headers", async () => ({
    ...(await vi.importActual("next/headers")),
    headers: async () => new Headers(),
  }));

  vi.mock("next/navigation", async (actual) => ({
    ...(await actual<typeof import("next/navigation")>()),
    redirect: mock.redirect,
  }));

  afterAll(async () => {
    await down();
  });

  afterEach(async () => {
    await truncate();
  });

  async function getUser() {
    const me = await db.query.users.findFirst();

    if (me === undefined) {
      throw new Error("User not found");
    }

    const { createdAt: _, ...rest } = me;

    return rest;
  }

  async function createTestUserAndWorkspace() {
    const userRepository = createUserRepository({ db });
    const workspaceRepository = createWorkspaceRepository({ db });

    const user = await userRepository.createUser({
      provider: "slack",
      externalId: "test-user-id",
      name: "Test User",
      email: "test@example.com",
      slackId: "U123456",
    });

    const workspace = await workspaceRepository.createWorkspace({
      provider: "slack",
      externalId: "test-workspace-id",
      name: "Test Workspace",
      domain: "test.slack.com",
      botUserId: "B123456",
      botAccessToken: "xoxb-test-token",
      notificationChannelId: "C123456",
      notificationChannelName: "general",
    });

    await workspaceRepository.addMember({
      workspaceId: workspace.id,
      userId: user.id,
    });

    return { user, workspace };
  }

  return {
    mock,
    container,
    db,
    truncate,
    down,
    getUser,
    createTestUserAndWorkspace,
  } as const;
}
