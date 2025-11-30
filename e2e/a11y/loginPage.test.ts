import { expect } from "@playwright/test";
import { test } from "../fixtures";

test.describe("Login Page", () => {
  test("should not have any automatically detectable accessibility issues", async ({
    loginPage,
    a11y,
  }) => {
    await loginPage.goTo();

    const res = await a11y().analyze();

    expect(res.violations).toEqual([]);
  });
});
