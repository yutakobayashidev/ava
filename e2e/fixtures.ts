import { AxeBuilder } from "@axe-core/playwright";
import { test as base } from "@playwright/test";
import { setupDB } from "../tests/db.setup";
import { setupApp } from "./helpers/app";
import { TopPage } from "./models/TopPage";
import { LoginPage } from "./models/LoginPage";
import { DashboardPage } from "./models/DashboardPage";
import {
  OnboardingPage,
  ConnectSlackPage,
  SetupMcpPage,
  OnboardingCompletePage,
} from "./models/OnboardingPage";
import { registerUserToDB } from "./helpers/users";
import type { User } from "@/db/schema";

export type TestFixtures = {
  topPage: TopPage;
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  onboardingPage: OnboardingPage;
  connectSlackPage: ConnectSlackPage;
  setupMcpPage: SetupMcpPage;
  onboardingCompletePage: OnboardingCompletePage;
  storageState: string;
  reset: () => Promise<void>;
  a11y: () => AxeBuilder;
  registerToDB: (user: User) => Promise<void>;
};

export type WorkerFixtures = {
  setup: Awaited<{
    db: Awaited<ReturnType<typeof setupDB>>["db"];
    appPort: number;
    baseURL: string;
    dbURL: string;
    truncate: () => Promise<void>;
  }>;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  topPage: ({ page }, use) => {
    use(new TopPage(page));
  },
  loginPage: ({ page }, use) => {
    use(new LoginPage(page));
  },
  dashboardPage: ({ page }, use) => {
    use(new DashboardPage(page));
  },
  onboardingPage: ({ page }, use) => {
    use(new OnboardingPage(page));
  },
  connectSlackPage: ({ page }, use) => {
    use(new ConnectSlackPage(page));
  },
  setupMcpPage: ({ page }, use) => {
    use(new SetupMcpPage(page));
  },
  onboardingCompletePage: ({ page }, use) => {
    use(new OnboardingCompletePage(page));
  },
  setup: [
    async ({ browser }, use) => {
      await using dbSetup = await setupDB({ port: "random" });
      await using appSetup = await setupApp(dbSetup.port);
      const baseURL = appSetup.baseURL;
      const originalNewContext = browser.newContext.bind(browser);

      browser.newContext = async () => {
        return originalNewContext({
          baseURL,
        });
      };

      await use({
        db: dbSetup.db,
        appPort: appSetup.appPort,
        baseURL,
        dbURL: dbSetup.url,
        truncate: () => dbSetup.truncate(),
      });
    },
    {
      scope: "worker",
      auto: true,
    },
  ],
  reset: ({ context, setup }, use) => {
    use(async () => {
      await Promise.all([setup.truncate(), context.clearCookies()]);
    });
  },
  registerToDB: async ({ reset, setup }, use) => {
    await use(async (user: User) => {
      await registerUserToDB(user, setup.dbURL);
    });
    await reset();
  },
  a11y: async ({ page }, use) => {
    const makeAxeBuilder = () =>
      new AxeBuilder({ page }).withTags([
        "wcag2a",
        "wcag2aa",
        "wcag21a",
        "wcag21aa",
      ]);

    await use(makeAxeBuilder);
  },
});
