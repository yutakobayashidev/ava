import { expect } from "@playwright/test";
import { test } from "../fixtures";

test.describe("Top Page", () => {
  test("自動的に検出されるアクセシビリティ上の問題がないこと", async ({
    topPage,
    a11y,
  }) => {
    await topPage.goTo();

    const res = await a11y().analyze();

    expect(res.violations).toEqual([]);
  });
});
