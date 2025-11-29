import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { config } from "./env";
import tsconfigPaths from "vite-tsconfig-paths";

config();

export default defineConfig(async () => {
  return {
    plugins: [react(), tsconfigPaths()],
    test: {
      globals: true,
      mockReset: true,
      restoreMocks: true,
      clearMocks: true,
      include: ["./src/**/*.test.{ts,tsx}"],
      globalSetup: "./tests/vitest.setup.ts",
      environment: "jsdom",
    },
  };
});
