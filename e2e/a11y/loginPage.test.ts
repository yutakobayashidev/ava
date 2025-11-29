import { expect } from "@playwright/test";
import { test } from "../fixtures";

test.describe("Login Page", () => {
  test("自動的に検出されるアクセシビリティ上の問題がないこと", async ({
    loginPage,
    a11y,
  }) => {
    await loginPage.goTo();

    const res = await a11y().analyze();

    expect(res.violations).toEqual([]);
  });
});
