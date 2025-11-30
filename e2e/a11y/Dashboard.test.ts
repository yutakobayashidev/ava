import { expect } from "@playwright/test";
import { test } from "../fixtures";
import { useUser } from "../helpers/users";
import { setupWorkspaceForUser } from "../helpers/workspace";
import { UserBuilder, WorkspaceBuilder } from "../builders";

test.describe("Dashboard Page", () => {
  const user1 = new UserBuilder().build();

  useUser(test, user1);

  test("should not have any automatically detectable accessibility issues", async ({
    dashboardPage,
    a11y,
    setup,
  }) => {
    const workspace1 = new WorkspaceBuilder().build();
    await setupWorkspaceForUser(setup.db, user1, workspace1);

    await dashboardPage.goTo();

    const res = await a11y().analyze();

    expect(res.violations).toEqual([]);
  });
});
