import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: "ava",
  "deployment.environment": process.env.NODE_ENV,
});

const url = process.env.TRACE_EXPORTER_URL || /* for local */ undefined;

const traceExporter = new OTLPTraceExporter({
  url,
});

const openTelemetrySDK = new NodeSDK({
  resource,
  traceExporter,
});

openTelemetrySDK.start();
