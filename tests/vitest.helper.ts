import { afterAll, afterEach, vi } from "vitest";

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

  vi.mock("@/clients/drizzle", () => ({
    db,
  }));

  afterAll(async () => {
    await down();
  });

  afterEach(async () => {
    await truncate();
  });

  vi.mock("server-only", () => {
    return {};
  });

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

  async function getUser() {
    const me = await db.query.users.findFirst();

    if (me === undefined) {
      throw new Error("User not found");
    }

    const { createdAt: _, ...rest } = me;

    return rest;
  }

  return {
    mock,
    container,
    db,
    truncate,
    down,
    getUser,
  } as const;
}
