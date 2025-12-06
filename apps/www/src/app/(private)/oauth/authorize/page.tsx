import { requireAuth } from "@/lib/auth";
import {
  createLoginRedirectUrl,
  validateAuthorizeRequest,
} from "@/lib/server/oauth";
import { getCurrentSession } from "@/lib/server/session";
import { createWorkspaceRepository } from "@/repos";
import { db } from "@ava/database/client";
import * as schema from "@ava/database/schema";
import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { uuidv7 } from "uuidv7";

export default async function AuthorizePage({
  searchParams,
}: PageProps<"/oauth/authorize">) {
  const { user } = await getCurrentSession();

  const params = await searchParams;

  if (!user || !user.id) {
    return redirect(createLoginRedirectUrl(params));
  }

  const validation = await validateAuthorizeRequest(params);

  if (!validation.success) {
    return (
      <main className="flex items-center justify-center h-screen">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-sm w-full text-center">
          <h1 className="text-2xl font-bold mb-4">エラー</h1>
          <p>{validation.errorDescription}</p>
          {validation.error && (
            <p className="text-xs text-gray-500 mt-4">
              エラーコード: {validation.error}
            </p>
          )}
        </div>
      </main>
    );
  }

  const { requestParams, client } = validation;

  const workspaceRepository = createWorkspaceRepository(db);
  const workspace = await workspaceRepository.findWorkspaceByUser(user.id);

  if (!workspace) {
    return (
      <main className="flex items-center justify-center h-screen">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-sm w-full text-center">
          <h1 className="text-2xl font-bold mb-4">エラー</h1>
          <p>現在のユーザーのワークスペースが見つかりません。</p>
          <p className="text-xs text-gray-500 mt-4">
            認可する前にワークスペースを接続してください。
          </p>
        </div>
      </main>
    );
  }

  const workspaceId = workspace.id;

  async function handleConsent(formData: FormData) {
    "use server";

    const { user } = await requireAuth();

    if (!client) throw new Error("Client not found during consent handling.");

    const consent = formData.get("consent");

    // TOCTOU
    const validation = await validateAuthorizeRequest(params);

    if (!validation.success) {
      return redirect("/");
    }

    const redirectUrl = new URL(requestParams.redirect_uri);
    if (requestParams.state) {
      redirectUrl.searchParams.set("state", requestParams.state);
    }

    if (consent === "deny") {
      redirectUrl.searchParams.set("error", "access_denied");
      return redirect(redirectUrl.toString());
    }

    const authorizationCode = randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.insert(schema.authCodes).values({
      id: uuidv7(),
      code: authorizationCode,
      expiresAt,
      clientId: client.id,
      userId: user.id,
      workspaceId,
      redirectUri: requestParams.redirect_uri,
      codeChallenge: requestParams.code_challenge ?? null,
      codeChallengeMethod: requestParams.code_challenge_method ?? null,
    });

    redirectUrl.searchParams.set("code", authorizationCode);
    redirect(redirectUrl.toString());
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            アプリケーションの認可
          </h1>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <p className="text-sm text-gray-600 mb-2">アプリケーション</p>
          <p className="text-lg font-semibold text-gray-900">{client.name}</p>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            このアプリケーションがあなたのアカウントへのアクセスを要求しています。
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-2">
              許可される操作:
            </p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li className="flex items-start">
                <svg
                  className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                タスクの作成と更新
              </li>
              <li className="flex items-start">
                <svg
                  className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                進捗状況の報告
              </li>
              <li className="flex items-start">
                <svg
                  className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                ワークスペース情報の読み取り
              </li>
            </ul>
          </div>
        </div>

        <form action={handleConsent}>
          <div className="flex flex-col gap-3">
            <button
              type="submit"
              name="consent"
              value="allow"
              className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              許可する
            </button>
            <button
              type="submit"
              name="consent"
              value="deny"
              className="w-full px-4 py-3 bg-white text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors"
            >
              拒否する
            </button>
          </div>
        </form>

        <p className="text-xs text-gray-500 text-center mt-6">
          許可することで、このアプリケーションが上記の操作を実行できるようになります。
        </p>
      </div>
    </main>
  );
}
