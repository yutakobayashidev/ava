import withBundleAnalyzer from "@next/bundle-analyzer";
import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";
import path from "path";
import { config } from "./env";

config();

const withMDX = createMDX();

export const withAnalyzer = (sourceConfig: NextConfig): NextConfig =>
  withBundleAnalyzer()(sourceConfig);

// ベース設定
let nextConfig: NextConfig = {
  poweredByHeader: false,
  reactCompiler: true,
  transpilePackages: ["@apps-sdk/widget-runtime"],
  // monorepo のルートをトレーシングルートに設定
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // labs/apps-sdk/dist をビルドに含める
  outputFileTracingIncludes: {
    "*": ["../../labs/apps-sdk/dist/**/*"],
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error"],
          }
        : false,
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  turbopack: {
    debugIds: true,
  },
  async rewrites() {
    return [
      {
        source: "/docs/:path*.mdx",
        destination: "/llms.mdx/:path*",
      },
      {
        source: "/docs/:path*.md",
        destination: "/llms.mdx/:path*",
      },
    ];
  },
  experimental: {
    browserDebugInfoInTerminal: true,
    turbopackFileSystemCacheForDev: true,
  },
  serverExternalPackages: [
    "@opentelemetry/exporter-metrics-otlp-grpc",
    "@opentelemetry/exporter-trace-otlp-grpc",
    "@opentelemetry/instrumentation-http",
    "@opentelemetry/resources",
    "@opentelemetry/sdk-metrics",
    "@opentelemetry/sdk-node",
    "@opentelemetry/sdk-trace-base",
    "@opentelemetry/semantic-conventions",
    "@opentelemetry/sdk-trace-node",
  ],
};

nextConfig = withMDX(nextConfig);

if (process.env.ANALYZE === "true") {
  nextConfig = withAnalyzer(nextConfig);
}

export default nextConfig;
