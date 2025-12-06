import type { KnipConfig } from "knip";

const config: KnipConfig = {
  workspaces: {
    ".": {
      ignore: [".github/workflows/**"],
    },
    "apps/www": {
      entry: ["source.config.ts", "src/hooks/use-mobile.ts"],
      playwright: {
        config: ["playwright.config.ts"],
        entry: ["e2e/**/*.ts"],
      },
      vitest: {
        entry: ["src/**/*.test.ts"],
      },
      ignore: [
        "src/components/ui/**",
        "env.ts",
        "next.config.ts",
        "vitest.config.ts",
        "reset.ts",
      ],
      ignoreDependencies: [
        "@ava/database",
        "@hookform/resolvers",
        "@radix-ui/react-accordion",
        "@radix-ui/react-alert-dialog",
        "@radix-ui/react-aspect-ratio",
        "@radix-ui/react-checkbox",
        "@radix-ui/react-collapsible",
        "@radix-ui/react-context-menu",
        "@radix-ui/react-hover-card",
        "@radix-ui/react-label",
        "@radix-ui/react-menubar",
        "@radix-ui/react-navigation-menu",
        "@radix-ui/react-popover",
        "@radix-ui/react-progress",
        "@radix-ui/react-radio-group",
        "@radix-ui/react-scroll-area",
        "@radix-ui/react-select",
        "@radix-ui/react-slider",
        "@radix-ui/react-switch",
        "@radix-ui/react-toggle",
        "@radix-ui/react-toggle-group",
        "@radix-ui/react-dialog",
        "@radix-ui/react-separator",
        "@radix-ui/react-tooltip",
        "date-fns",
        "cmdk",
        "embla-carousel-react",
        "input-otp",
        "next-themes",
        "react-day-picker",
        "react-hook-form",
        "react-resizable-panels",
        "recharts",
        "vaul",
        "postcss",
        "sonner",
      ],
      ignoreBinaries: ["claude", "stripe", "tunnelto"],
    },
    "packages/database": {
      entry: ["src/**/*.ts"],
      ignore: ["drizzle.config.ts"],
    },
  },
};

export default config;
