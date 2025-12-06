import { expect, type Page } from "@playwright/test";

export class Base {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async expectQueryParams(params: Record<string, string>) {
    const url = new URL(this.page.url());
    for (const [key, value] of Object.entries(params)) {
      expect(url.searchParams.get(key)).toBe(value);
    }
  }
}
