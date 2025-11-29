import app from "@/handlers/api/health";
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("api/health", () => {
  describe("GET /", () => {
    it("should return 200", async () => {
      const res = await app.request("/");
      expect(await res.json()).toMatchInlineSnapshot(`
        {
          "status": "ok",
        }
      `);
      expect(res.status).toBe(200);
    });
  });
});
