import { describe, expect, it } from "vitest";
import { buildSlackThreadUrl } from "./slack";

describe("utils/slack", () => {
  describe("buildSlackThreadUrl", () => {
    it("app.slack.com形式のスレッドURLを生成できる", () => {
      const url = buildSlackThreadUrl({
        workspaceExternalId: "T12345678",
        channelId: "C98765432",
        threadTs: "1700000000.123456",
      });

      expect(url).toBe(
        "https://app.slack.com/client/T12345678/C98765432/thread/C98765432-1700000000.123456",
      );
    });

    it("ドメイン情報からパーマリンクを生成できる", () => {
      const url = buildSlackThreadUrl({
        workspaceDomain: "example",
        channelId: "C98765432",
        threadTs: "1700000000.123456",
      });

      expect(url).toBe(
        "https://example.slack.com/archives/C98765432/p1700000000123456?thread_ts=1700000000.123456&cid=C98765432",
      );
    });

    it("必要な情報が欠けている場合はnullを返す", () => {
      expect(
        buildSlackThreadUrl({
          workspaceExternalId: "T123",
          channelId: null,
          threadTs: "1700000000.123456",
        }),
      ).toBeNull();

      expect(
        buildSlackThreadUrl({
          workspaceExternalId: "T123",
          channelId: "C987",
          threadTs: null,
        }),
      ).toBeNull();
    });
  });
});
