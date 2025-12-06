import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@ava/database/client";
import { createWorkspaceRepository } from "@/repos";
import { requireAuth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "オンボーディング",
  description: "Avaの初期設定を行います。",
};

export default async function OnboardingPage() {
  const { user } = await requireAuth();

  const workspaceRepository = createWorkspaceRepository({ db });
  const workspace = await workspaceRepository.findWorkspaceByUser(user.id);

  // Slack連携が完了していればStep 2へ
  if (workspace?.botAccessToken) {
    redirect("/onboarding/setup-mcp");
  }

  // 未連携であればStep 1へ
  redirect("/onboarding/connect-slack");
}
