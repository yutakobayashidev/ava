import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Task Manager - Stop Context Switching, Start Shipping",
  description: "集中作業に最適化されたタスク管理。コーディングエージェントが自動的に進捗をSlackに同期—コンテキストスイッチ不要。フロー状態を保つために作られました。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
