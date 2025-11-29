import { AxeBuilder } from "@axe-core/playwright";
/** biome-ignore lint/style/noRestrictedImports: fixturesの定義自体に必要 */
import { test as base } from "@playwright/test";
import { setupDB } from "../tests/db.setup";
import { setupApp } from "./helpers/app";
import { TopPage } from "./models/TopPage";
import { LoginPage } from "./models/LoginPage";

export type TestFixtures = {
  topPage: TopPage;
  loginPage: LoginPage;
  storageState: string;
  reset: () => Promise<void>;
  a11y: () => AxeBuilder;
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
