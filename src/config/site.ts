export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME,
  description:
    "集中作業に最適化されたタスク管理。コーディングエージェントが自動的に進捗をSlackに同期—コンテキストスイッチ不要。フロー状態を保つために作られました。",
  github: "https://github.com/yutakobayashidev/ava",
} as const;

export type SiteConfig = typeof siteConfig;

export const META_THEME_COLORS = {
  light: "#ffffff",
  dark: "#09090b",
};
