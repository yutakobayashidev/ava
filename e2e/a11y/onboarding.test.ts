import { expect } from "@playwright/test";
import { test } from "../fixtures";
import { useUser } from "../helpers/users";
import { setupWorkspaceForUser } from "../helpers/workspace";
import { UserBuilder, WorkspaceBuilder } from "../builders";

test.describe("Onboarding Pages", () => {
  const onboardingUser = new UserBuilder()
    .withId("onboarding_user")
    .withEmail("onboarding@example.com")
    .withSlackId("U_ONBOARDING")
    .withoutOnboardingCompleted()
    .build();

  useUser(test, onboardingUser);

  test("ConnectSlack page should not have any automatically detectable accessibility issues", async ({
    connectSlackPage,
    a11y,
  }) => {
    await connectSlackPage.goTo();

    const res = await a11y().analyze();

    expect(res.violations).toEqual([]);
  });

  test("SetupMCP page should not have any automatically detectable accessibility issues", async ({
    setupMcpPage,
    a11y,
    setup,
  }) => {
    // Setup workspace with bot token to access MCP setup page
    const workspace = new WorkspaceBuilder()
      .withBotAccessToken("xoxb-test-token")
      .build();

    await setupWorkspaceForUser(setup.db, onboardingUser, workspace);

    await setupMcpPage.goTo();

    const res = await a11y().analyze();

    expect(res.violations).toEqual([]);
  });

  test("OnboardingComplete page should not have any automatically detectable accessibility issues", async ({
    onboardingCompletePage,
    a11y,
    setup,
  }) => {
    // Setup workspace to access complete page
    const workspace = new WorkspaceBuilder().build();
    await setupWorkspaceForUser(setup.db, onboardingUser, workspace);

    await onboardingCompletePage.goTo();

    const res = await a11y().analyze();

    expect(res.violations).toEqual([]);
  });
});
