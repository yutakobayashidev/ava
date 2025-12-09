import { getCurrentSession } from "@/lib/server/session";
import { createWorkspaceRepository } from "@/repos";
import type { Database } from "@ava/database/client";
import { headers } from "next/headers";
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
 * 未認証の場合は /login にリダイレクト（現在のURLをcallbackUrlとして保持）
 */
export async function auth(): Promise<RequireAuthResult> {
  const { user } = await getCurrentSession();

  if (!user) {
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") || "/";
    const loginUrl = new URL("/login", "http://localhost");
    loginUrl.searchParams.set("callbackUrl", pathname);
    redirect(loginUrl.pathname + loginUrl.search);
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
  const { user } = await auth();

  const workspaceRepository = createWorkspaceRepository(db);
  const workspace = await workspaceRepository.findWorkspaceByUser(user.id);

  if (!workspace) {
    redirect("/onboarding/connect-slack");
  }

  return { user, workspace };
}
