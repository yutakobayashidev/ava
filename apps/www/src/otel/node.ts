import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

import { OTLPTraceExporter as OTLPGrpcExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPTraceExporter as OTLPHttpExporter } from "@opentelemetry/exporter-trace-otlp-http";

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: "ava",
});

const traceExporter =
  process.env.NODE_ENV === "production"
    ? new OTLPHttpExporter({
        url: "https://api.axiom.co/v1/traces",
        headers: {
          Authorization: `Bearer ${process.env.AXIOM_API_TOKEN}`,
          "X-Axiom-Dataset": `${process.env.AXIOM_DATASET_NAME}`,
        },
      })
    : new OTLPGrpcExporter({
        url: "http://localhost:4317",
      });

const sdk = new NodeSDK({
  resource,
  spanProcessor: new BatchSpanProcessor(traceExporter),
});

sdk.start();
