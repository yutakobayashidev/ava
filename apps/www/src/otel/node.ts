import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: "ava",
});

const url = process.env.TRACE_EXPORTER_URL;

const traceExporter = new OTLPTraceExporter({
  url,
  ...(process.env.NODE_ENV === "production"
    ? {
        headers: {
          Authorization: `Bearer ${process.env.AXIOM_API_TOKEN}`,
          "X-Axiom-Dataset": `${process.env.AXIOM_DATASET_NAME}`,
        },
      }
    : {}),
});

const spanProcessor = new BatchSpanProcessor(traceExporter);

const openTelemetrySDK = new NodeSDK({
  resource,
  spanProcessor,
});

openTelemetrySDK.start();
