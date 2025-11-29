import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import drizzle from "eslint-plugin-drizzle";
import tseslint from "typescript-eslint";
import vitest from "@vitest/eslint-plugin";
import playwright from "eslint-plugin-playwright";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".source",
  ]),
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      drizzle,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      "@typescript-eslint/no-unsafe-type-assertion": "error",
      "drizzle/enforce-delete-with-where": [
        "error",
        {
          drizzleObjectName: ["db"],
        },
      ],
      "drizzle/enforce-update-with-where": [
        "error",
        {
          drizzleObjectName: ["db"],
        },
      ],
    },
  },
  {
    name: "test",
    files: ["**/*.spec.ts*", "**/*.test.ts*", "**/*.test-d.ts*"],
    ignores: ["e2e/**"],
    plugins: {
      vitest,
    },
    rules: {
      ...vitest.configs.recommended.rules,
      "vitest/consistent-test-it": ["error", { fn: "it" }],
      "vitest/require-top-level-describe": ["error"],
      "@typescript-eslint/no-unsafe-type-assertion": "off",
    },
  },
  {
    name: "playwright",
    ...playwright.configs["flat/recommended"],
    files: ["e2e/**"],
    rules: {
      "playwright/no-networkidle": "off",
      "react-hooks/rules-of-hooks": "off",
    },
  },
  {
    name: "playwright-integrations-overrides",
    files: ["e2e/integrations/**"],
    rules: {
      "playwright/expect-expect": "off",
    },
  },
]);

export default eslintConfig;
