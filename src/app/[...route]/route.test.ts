import app from "@/routes/health";
import { describe, it, expect } from "vitest";

describe("api/health", () => {
  describe("GET /", async () => {
    it("should return 200", async () => {
      const res = await app.request("/");
      expect(await res.json()).toMatchInlineSnapshot(`
        {
          "status": "ok",
        }
      `);
    });
  });
});
