import { generateState } from "arctic";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

import { createHonoApp } from "@/create-app";
import dailyReportInteraction from "@/interactions/daily-report";
import { handleApplicationCommands } from "@/interactions/handleSlackCommands";
import { validateSessionToken } from "@/lib/server/session";
import { getWorkspaceBotToken } from "@/lib/slack";
import { absoluteUrl } from "@/lib/utils";
import { verifySlackSignature } from "@/middleware/slack";
import { createUserRepository } from "@/repos/users";
import { createWorkspaceRepository } from "@/repos/workspaces";
import { installWorkspace } from "@/usecases/slack/installWorkspace";
import {
  constructCompleteTaskWorkflow,
  constructPauseTaskWorkflow,
  constructReportBlockedWorkflow,
  constructResolveBlockedWorkflow,
  constructResumeTaskWorkflow,
} from "@/usecases/taskSessions/constructor";
import { buildRedirectUrl } from "@/utils/urls";
import {
  buildSlackInstallUrl,
  createCompleteTaskModal,
  createPauseTaskModal,
  createReportBlockedModal,
  createResolveBlockedModal,
  createResumeTaskModal,
  openModal,
  type SlackOAuthConfig,
} from "@ava/integrations/slack";
import { zValidator } from "@hono/zod-validator";
import { env } from "hono/adapter";
import { z } from "zod";

const app = createHonoApp();

const STATE_COOKIE = "slack_install_state";

const slackConfig: SlackOAuthConfig = {
  clientId: process.env.SLACK_APP_CLIENT_ID,
  clientSecret: process.env.SLACK_APP_CLIENT_SECRET,
  redirectUri: absoluteUrl("/api/slack/install/callback"),
};

app.get("/install/start", async (ctx) => {
  const sessionToken = getCookie(ctx, "session");

  const { user } = sessionToken
    ? await validateSessionToken(sessionToken)
    : { user: null };
  if (!user) {
    return ctx.json({ error: "Unauthorized" }, 401);
  }

  const state = generateState();
  const authorizeUrl = buildSlackInstallUrl(slackConfig, state);
  const { NODE_ENV } = env(ctx);

  setCookie(ctx, STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  return ctx.redirect(authorizeUrl);
});

app.get("/install/callback", async (ctx) => {
  const sessionToken = getCookie(ctx, "session");

  const { user } = sessionToken
    ? await validateSessionToken(sessionToken)
    : { user: null };
  if (!user) {
    return ctx.json({ error: "Unauthorized" }, 401);
  }

  const code = ctx.req.query("code");
  const state = ctx.req.query("state");
  const storedState = getCookie(ctx, STATE_COOKIE);
  const { NODE_ENV } = env(ctx);

  // オンボーディング完了済みかどうかで戻り先を決定
  const isOnboarding = !user.onboardingCompletedAt;
  const fallbackPath = isOnboarding ? "/onboarding/connect-slack" : "/settings";

  if (!code) {
    return ctx.redirect(
      buildRedirectUrl(ctx.req.raw, fallbackPath, {
        error: "missing_code",
      }),
    );
  }

  if (!storedState || storedState !== state) {
    return ctx.redirect(
      buildRedirectUrl(ctx.req.raw, fallbackPath, {
        error: "state_mismatch",
      }),
    );
  }

  const result = await installWorkspace(
    {
      code,
      userId: user.id,
    },
    {
      db: ctx.get("db"),
      ai: ctx.get("ai"),
      stripe: ctx.get("stripe"),
      user: ctx.get("user"),
      workspace: ctx.get("workspace"),
    },
  );

  // Cookie削除（成功/失敗に関わらず）
  deleteCookie(ctx, STATE_COOKIE, {
    path: "/",
    sameSite: "lax",
    secure: NODE_ENV === "production",
  });

  // 結果に応じてリダイレクト
  if (result.success) {
    return ctx.redirect(
      buildRedirectUrl(ctx.req.raw, fallbackPath, {
        installed: "1",
        team: result.teamName,
      }),
    );
  } else {
    return ctx.redirect(
      buildRedirectUrl(ctx.req.raw, fallbackPath, {
        error: result.error,
      }),
    );
  }
});

app.post(
  "/commands",
  verifySlackSignature,
  zValidator(
    "form",
    z.object({
      api_app_id: z.string(),
      team_id: z.string(),
      user_id: z.string(),
      channel_id: z.string(),
      text: z.string().optional(),
      command: z.enum(["/daily-report"]),
    }),
  ),
  async (ctx) => {
    const { team_id: teamId, user_id: userId, command } = ctx.req.valid("form");

    const result = await handleApplicationCommands({
      command,
      teamId,
      userId,
      commands: [dailyReportInteraction],
      ctx: {
        db: ctx.get("db"),
        ai: ctx.get("ai"),
        stripe: ctx.get("stripe"),
        user: ctx.get("user"),
        workspace: ctx.get("workspace"),
      },
    });

    return ctx.json(result);
  },
);

app.post("/interactions", verifySlackSignature, async (ctx) => {
  const formData = await ctx.req.formData();
  const payloadString = formData.get("payload");

  if (typeof payloadString !== "string") {
    return ctx.json({ error: "Invalid payload" }, 400);
  }

  const payload = JSON.parse(payloadString);

  // ボタンクリック（block_actions）の処理
  if (payload.type === "block_actions") {
    const action = payload.actions[0];
    const actionId = action.action_id;
    const actionValue = action.value;
    const triggerId = payload.trigger_id;
    const teamId = payload.team.id;

    const db = ctx.get("db");
    const workspaceRepository = createWorkspaceRepository(db);

    // ワークスペース情報を取得
    const workspace = await workspaceRepository.findWorkspaceByExternalId({
      provider: "slack",
      externalId: teamId,
    });
    if (!workspace) {
      return ctx.json({ error: "Workspace not found" }, 404);
    }

    // Bot tokenを取得
    const token = await getWorkspaceBotToken({
      workspace,
      workspaceRepository,
    });

    // action_idに応じてモーダルを表示
    let view;
    switch (actionId) {
      case "complete_task":
        view = createCompleteTaskModal(actionValue);
        break;
      case "report_blocked":
        view = createReportBlockedModal(actionValue);
        break;
      case "pause_task":
        view = createPauseTaskModal(actionValue);
        break;
      case "resume_task":
        view = createResumeTaskModal(actionValue);
        break;
      case "resolve_blocked": {
        // JSONをパースしてtaskSessionIdとblockReportIdを取得
        const parsed = JSON.parse(actionValue);
        view = createResolveBlockedModal(
          parsed.taskSessionId,
          parsed.blockReportId,
        );
        break;
      }
      default:
        return ctx.json({ error: "Unknown action" }, 400);
    }

    try {
      await openModal({ token, triggerId, view });
      return ctx.json({ ok: true });
    } catch (error) {
      console.error("Failed to open modal:", error);
      return ctx.json({ error: "Failed to open modal" }, 500);
    }
  }

  // モーダル送信（view_submission）の処理
  if (payload.type === "view_submission") {
    const view = payload.view;
    const callbackId = view.callback_id;
    const taskSessionId = view.private_metadata;
    const values = view.state.values;
    const teamId = payload.team.id;
    const userId = payload.user.id;

    const db = ctx.get("db");
    const workspaceRepository = createWorkspaceRepository(db);
    const userRepository = createUserRepository(db);

    // ワークスペースとユーザーを取得
    const workspace = await workspaceRepository.findWorkspaceByExternalId({
      provider: "slack",
      externalId: teamId,
    });
    if (!workspace) {
      return ctx.json({ error: "Workspace not found" }, 400);
    }

    const user = await userRepository.findUserBySlackIdAndTeamId(
      userId,
      teamId,
    );
    if (!user) {
      return ctx.json({ error: "User not found" }, 400);
    }

    try {
      switch (callbackId) {
        case "complete_task_modal": {
          const summary =
            values.summary_block.summary_input.value || "完了しました";
          await constructCompleteTaskWorkflow(ctx)({
            kind: "CompleteTaskSessionCommand",
            input: {
              workspace,
              user,
              taskSessionId,
              summary,
            },
          });
          break;
        }
        case "report_blocked_modal": {
          const reason =
            values.reason_block.reason_input.value || "詰まっています";
          await constructReportBlockedWorkflow(ctx)({
            kind: "ReportBlockedCommand",
            input: {
              workspace,
              user,
              taskSessionId,
              reason,
            },
          });
          break;
        }
        case "pause_task_modal": {
          const reason = values.reason_block.reason_input.value || "休止します";
          await constructPauseTaskWorkflow(ctx)({
            kind: "PauseTaskCommand",
            input: {
              workspace,
              user,
              taskSessionId,
              reason,
            },
          });
          break;
        }
        case "resume_task_modal": {
          const summary =
            values.summary_block.summary_input.value || "再開しました";
          await constructResumeTaskWorkflow(ctx)({
            kind: "ResumeTaskCommand",
            input: {
              workspace,
              user,
              taskSessionId,
              summary,
            },
          });
          break;
        }
        case "resolve_blocked_modal": {
          const metadata = JSON.parse(taskSessionId);
          await constructResolveBlockedWorkflow(ctx)({
            kind: "ResolveBlockedCommand",
            input: {
              workspace,
              user,
              taskSessionId: metadata.taskSessionId,
              blockReportId: metadata.blockReportId,
            },
          });
          break;
        }
        default:
          return ctx.json({ error: "Unknown modal" }, 400);
      }

      return ctx.json({ response_action: "clear" });
    } catch (error) {
      console.error("Failed to process modal submission:", error);
      return ctx.json(
        {
          response_action: "errors",
          errors: {
            general:
              error instanceof Error ? error.message : "処理に失敗しました",
          },
        },
        500,
      );
    }
  }

  return ctx.json({ error: "Unknown interaction type" }, 400);
});

export default app;
