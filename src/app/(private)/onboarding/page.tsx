import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { db } from "@/clients/drizzle";
import { createWorkspaceRepository } from "@/repos";

export const metadata: Metadata = {
  title: "オンボーディング",
  description: "Avaの初期設定を行います。",
};

export default async function OnboardingPage() {
  const { user } = await getCurrentSession();

  if (!user) {
    redirect("/login?callbackUrl=/onboarding");
  }

  const workspaceRepository = createWorkspaceRepository({ db });
  const [membership] = await workspaceRepository.listWorkspacesForUser({
    userId: user.id,
    limit: 1,
  });
  const workspace = membership?.workspace;

  // Slack連携が完了していればStep 2へ
  if (workspace?.botAccessToken) {
    redirect("/onboarding/setup-mcp");
  }

  // 未連携であればStep 1へ
  redirect("/onboarding/connect-slack");
}
