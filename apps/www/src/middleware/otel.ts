import { context, propagation, trace } from "@opentelemetry/api";
import type { Context } from "hono";

export const withTraceResponseHeader = async (
  c: Context,
  next: () => Promise<void>,
) => {
  await next();

  const span = trace.getSpan(context.active());
  if (!span) return;

  const headersCarrier: Record<string, string> = {};
  propagation.inject(context.active(), headersCarrier);
  const traceparent = headersCarrier.traceparent;
  if (traceparent) {
    c.res.headers.set("traceparent", traceparent);
    c.res.headers.append("Server-Timing", `traceparent;desc="${traceparent}"`);
  }

  c.res.headers.set("X-Trace-Id", span.spanContext().traceId);

  const exposed = c.res.headers.get("Access-Control-Expose-Headers");
  const exposeSet = new Set(
    (exposed?.split(",").map((h) => h.trim()) ?? []).concat([
      "traceparent",
      "Server-Timing",
      "X-Trace-Id",
    ]),
  );
  c.res.headers.set("Access-Control-Expose-Headers", [...exposeSet].join(", "));
};
