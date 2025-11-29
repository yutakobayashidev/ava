import type { KnipConfig } from "knip";

const config: KnipConfig = {
  ignore: [".github/workflows/**"],
  ignoreDependencies: ["postcss", "@eslint/js", "@svgr/webpack"],
  ignoreBinaries: ["only-allow", "claude"],
};

export default config;
