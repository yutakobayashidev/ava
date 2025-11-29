import { describe, expect, it } from "vitest";
import { createDBUrl } from "./db";

describe("utils/db", () => {
  describe("createDBUrl", () => {
    it("環境変数でURLを作成する", () => {
      expect(createDBUrl({})).toMatchInlineSnapshot(
        `"postgresql://local:1234@localhost:5432/local"`,
      );
    });

    it("パラメータでURLを作成する", () => {
      expect(
        createDBUrl({
          user: "user",
          password: "password",
          host: "host",
          port: 5432,
          db: "db",
        }),
      ).toMatchInlineSnapshot(`"postgresql://user:password@host:5432/db"`);
    });
  });
});
