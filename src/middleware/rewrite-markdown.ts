import { aiBots } from "@hono/ua-blocker/ai-bots";
import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";
import { MiddlewareHandler } from "hono";
import { NextRequest, NextResponse } from "next/server";

const { rewrite: rewriteLLM } = rewritePath("/docs/*path", "/llms.mdx/*path");

export const rewriteMarkdownMiddleware: MiddlewareHandler = async (c, next) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  const request = c.req.raw as NextRequest;
  const ua = c.req.header("User-Agent")?.toUpperCase();

  if ((ua && aiBots.test(ua)) || isMarkdownPreferred(request)) {
    const result = rewriteLLM(request.nextUrl.pathname);
    if (result) {
      return NextResponse.rewrite(new URL(result, request.nextUrl));
    }
  }

  await next();
};
