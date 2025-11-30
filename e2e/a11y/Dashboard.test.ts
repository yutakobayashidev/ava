import { expect } from "@playwright/test";
import { test } from "../fixtures";
import { useUser } from "../helpers/users";
import { setupWorkspaceForUser } from "../helpers/workspace";
import { user1, workspace1 } from "../dummyUsers";

test.describe("Dashboard Page", () => {
  useUser(test, user1);

  test("should not have any automatically detectable accessibility issues", async ({
    dashboardPage,
    a11y,
    setup,
  }) => {
    await setupWorkspaceForUser(setup.db, user1, workspace1);

    await dashboardPage.goTo();

    const res = await a11y().analyze();

    expect(res.violations).toEqual([]);
  });
});
