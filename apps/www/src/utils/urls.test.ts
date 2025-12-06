import { describe, expect, it } from "vitest";
import { serializeSearchParams, buildRedirectUrl } from "./urls";

describe("utils/urls", () => {
  describe("serializeSearchParams", () => {
    it("基本的なパラメータを追加できる", () => {
      const result = serializeSearchParams("https://example.com", "/path", {
        key: "value",
      });
      expect(result).toBe("https://example.com/path?key=value");
    });

    it("複数のパラメータを追加できる", () => {
      const result = serializeSearchParams("https://example.com", "/path", {
        client_id: "test-client",
        redirect_uri: "https://app.example.com/callback",
        state: "random-state",
      });
      const url = new URL(result);
      expect(url.searchParams.get("client_id")).toBe("test-client");
      expect(url.searchParams.get("redirect_uri")).toBe(
        "https://app.example.com/callback",
      );
      expect(url.searchParams.get("state")).toBe("random-state");
    });

    it("空のパラメータでもURLを生成できる", () => {
      const result = serializeSearchParams("https://example.com", "/path", {});
      expect(result).toBe("https://example.com/path");
    });

    it("相対パスを正しく処理できる", () => {
      const result = serializeSearchParams(
        "https://example.com",
        "/oauth/authorize",
        { code: "123" },
      );
      expect(result).toBe("https://example.com/oauth/authorize?code=123");
    });

    it("originのみの場合も正しく処理できる", () => {
      const result = serializeSearchParams("http://localhost:3000", "/login", {
        callbackUrl: "/dashboard",
      });
      expect(result).toBe(
        "http://localhost:3000/login?callbackUrl=%2Fdashboard",
      );
    });

    it("特殊文字を正しくエンコードする", () => {
      const result = serializeSearchParams("https://example.com", "/path", {
        message: "Hello World!",
        url: "https://example.com/callback?foo=bar",
      });
      const url = new URL(result);
      expect(url.searchParams.get("message")).toBe("Hello World!");
      expect(url.searchParams.get("url")).toBe(
        "https://example.com/callback?foo=bar",
      );
    });

    it("日本語を正しくエンコードする", () => {
      const result = serializeSearchParams("https://example.com", "/path", {
        error: "エラーが発生しました",
      });
      const url = new URL(result);
      expect(url.searchParams.get("error")).toBe("エラーが発生しました");
    });

    it("既存のクエリパラメータを上書きせず追加する", () => {
      const result = serializeSearchParams(
        "https://example.com",
        "/path?existing=param",
        { new: "value" },
      );
      const url = new URL(result);
      expect(url.searchParams.get("existing")).toBe("param");
      expect(url.searchParams.get("new")).toBe("value");
    });
  });

  describe("buildRedirectUrl", () => {
    it("リクエストのoriginを基準にURLを構築できる", () => {
      const req = new Request("https://example.com/current-path");
      const result = buildRedirectUrl(req, "/redirect", { key: "value" });
      expect(result).toBe("https://example.com/redirect?key=value");
    });

    it("複数のパラメータを追加できる", () => {
      const req = new Request("http://localhost:3000/api/callback");
      const result = buildRedirectUrl(req, "/slack/install", {
        error: "missing_code",
        team: "test-team",
      });
      const url = new URL(result);
      expect(url.searchParams.get("error")).toBe("missing_code");
      expect(url.searchParams.get("team")).toBe("test-team");
    });

    it("空のパラメータでもURLを生成できる", () => {
      const req = new Request("https://example.com/");
      const result = buildRedirectUrl(req, "/path", {});
      expect(result).toBe("https://example.com/path");
    });

    it("異なるポートでも正しく動作する", () => {
      const req = new Request("http://localhost:8080/api");
      const result = buildRedirectUrl(req, "/onboarding/connect-slack", {
        installed: "1",
      });
      expect(result).toBe(
        "http://localhost:8080/onboarding/connect-slack?installed=1",
      );
    });
  });
});
