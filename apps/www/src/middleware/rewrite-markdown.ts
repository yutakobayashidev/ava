import { aiBots } from "@hono/ua-blocker/ai-bots";
import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";
import { createMiddleware } from "hono/factory";
import { NextResponse } from "next/server";

const { rewrite: rewriteLLM } = rewritePath("/docs/*path", "/llms.mdx/*path");

export const rewriteMarkdownMiddleware = createMiddleware(async (c, next) => {
  const ua = c.req.header("User-Agent")?.toUpperCase();

  const pathname = c.req.path;

  if ((ua && aiBots.test(ua)) || isMarkdownPreferred(c.req.raw)) {
    const result = rewriteLLM(pathname);
    if (result) {
      return NextResponse.rewrite(new URL(result, c.req.url));
    }
  }

  await next();
});
