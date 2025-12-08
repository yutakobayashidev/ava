import { siteConfig } from "@/config/site";
import type { Metadata } from "next";
import { register } from "../instrumentation";
import "./globals.css";

register();

export const metadata: Metadata = {
  title: `${siteConfig.name} - Stop Context Switching, Start Shipping`,
  description: siteConfig.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="privacy-policy" href="/docs/privacy" />
        <link rel="terms-of-service" href="/docs/terms" />
      </head>
      <body>{children}</body>
    </html>
  );
}
