import { getCurrentSession } from "@/lib/server/session";
import { createWorkspaceRepository } from "@/repos";
import type { Database } from "@ava/database/client";
import { redirect } from "next/navigation";

type RequireAuthResult = {
  user: NonNullable<Awaited<ReturnType<typeof getCurrentSession>>["user"]>;
};

type RequireWorkspaceResult = RequireAuthResult & {
  workspace: NonNullable<
    Awaited<
      ReturnType<
        ReturnType<typeof createWorkspaceRepository>["findWorkspaceByUser"]
      >
    >
  >;
};

/**
 * 認証が必要なページで使用するヘルパー関数
 * 未認証の場合は /login にリダイレクト
 */
export async function requireAuth(): Promise<RequireAuthResult> {
  const { user } = await getCurrentSession();

  if (!user) {
    redirect("/login");
  }

  return { user };
}

/**
 * ワークスペースが必要なページで使用するヘルパー関数
 * 未認証の場合は /login に、ワークスペース未設定の場合は /onboarding/connect-slack にリダイレクト
 */
export async function requireWorkspace(
  db: Database,
): Promise<RequireWorkspaceResult> {
  const { user } = await requireAuth();

  const workspaceRepository = createWorkspaceRepository({ db });
  const workspace = await workspaceRepository.findWorkspaceByUser(user.id);

  if (!workspace) {
    redirect("/onboarding/connect-slack");
  }

  return { user, workspace };
}
