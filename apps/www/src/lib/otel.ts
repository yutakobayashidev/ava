import { type Attributes, SpanStatusCode, trace } from "@opentelemetry/api";
import type { ResultAsync } from "neverthrow";

export function withSpanAsync<A extends unknown[], T, E>(
  spanName: string,
  fn: (...args: A) => ResultAsync<T, E>,
  options: {
    tracerName?: string;
    spanAttrs?: (args: A) => Attributes;
    okAttrs?: (args: A, v: T) => Attributes;
    errAttrs?: (args: A, err: E) => Attributes;
  } = {},
): (...args: A) => ResultAsync<T, E> {
  const { tracerName = "ava", spanAttrs, okAttrs, errAttrs } = options;
  const tracer = trace.getTracer(tracerName);
  return (...args: A) => {
    return tracer.startActiveSpan(spanName, (span) => {
      try {
        const res = fn(...args);

        return res
          .map((v) => {
            span.setStatus({ code: SpanStatusCode.UNSET });
            span.setAttributes({ ...spanAttrs?.(args), ...okAttrs?.(args, v) });
            span.end();
            return v;
          })
          .mapErr((e) => {
            span.recordException(
              e instanceof Error ? e : new Error(JSON.stringify(e)),
            );
            span.setStatus({ code: SpanStatusCode.ERROR, message: String(e) });
            span.setAttributes({
              ...spanAttrs?.(args),
              ...errAttrs?.(args, e),
            });
            span.end();
            return e;
          });
      } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        span.recordException(err as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.setAttributes({ ...spanAttrs?.(args) });
        span.end();
        throw err;
      }
    });
  };
}
