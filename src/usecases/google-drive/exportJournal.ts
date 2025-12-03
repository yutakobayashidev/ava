import type { Env } from "@/app/create-app";
import { createGoogleDriveConnectionRepository } from "@/repos";
import { refreshGoogleDriveToken, uploadFileToDrive } from "@/lib/googleDrive";
import * as schema from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

type ExportJournal = {
  userId: string;
  date?: string; // YYYY-MM-DD format, defaults to today
};

type ExportJournalResult =
  | { success: true; webViewLink: string }
  | { success: false; error: string };

const generateJournalContent = (
  tasks: Array<{
    issueTitle: string;
    issueId: string | null;
    issueProvider: string;
    initialSummary: string;
    createdAt: Date;
    events: Array<{
      eventType: string;
      summary: string | null;
      reason: string | null;
      createdAt: Date;
    }>;
  }>,
  date: string,
): string => {
  let content = `# Journal: ${date}\n\n`;
  content += `## Summary\n${tasks.length} task(s) on this date.\n\n---\n\n`;

  for (const task of tasks) {
    content += `## ${task.issueTitle}\n\n`;
    content += `- **Started**: ${task.createdAt.toLocaleString()}\n`;
    if (task.issueId) {
      content += `- **Issue**: ${task.issueProvider}#${task.issueId}\n`;
    }
    content += `- **Initial Summary**: ${task.initialSummary}\n\n`;

    if (task.events.length > 0) {
      content += `### Timeline\n\n`;
      for (const event of task.events) {
        const timestamp = event.createdAt.toLocaleString();
        const eventLabel = event.eventType.replace(/_/g, " ").toUpperCase();
        content += `- **${timestamp}** [${eventLabel}]`;
        if (event.summary) {
          content += `: ${event.summary}`;
        } else if (event.reason) {
          content += `: ${event.reason}`;
        }
        content += `\n`;
      }
    }

    content += `\n---\n\n`;
  }

  return content;
};

export const exportJournalToGoogleDrive = async (
  params: ExportJournal,
  ctx: Env["Variables"],
): Promise<ExportJournalResult> => {
  const { userId, date: inputDate } = params;
  const { db } = ctx;

  try {
    const repository = createGoogleDriveConnectionRepository({ db });
    let connection = await repository.findConnectionByUserId(userId);

    if (!connection) {
      return {
        success: false,
        error: "google_drive_not_connected",
      };
    }

    // トークンの有効期限チェックと更新
    const now = new Date();
    if (connection.expiresAt <= now) {
      const refreshResult = await refreshGoogleDriveToken(
        connection.refreshToken,
      );
      connection = await repository.updateConnection({
        userId,
        accessToken: refreshResult.accessToken,
        expiresAt: refreshResult.expiresAt,
      });

      if (!connection) {
        return {
          success: false,
          error: "failed_to_update_token",
        };
      }
    }

    // デフォルトは今日
    const targetDate = inputDate ?? new Date().toISOString().split("T")[0];

    // タスクとイベントを取得
    const tasks = await db
      .select({
        id: schema.taskSessions.id,
        issueTitle: schema.taskSessions.issueTitle,
        issueId: schema.taskSessions.issueId,
        issueProvider: schema.taskSessions.issueProvider,
        initialSummary: schema.taskSessions.initialSummary,
        createdAt: schema.taskSessions.createdAt,
      })
      .from(schema.taskSessions)
      .where(
        and(
          eq(schema.taskSessions.userId, userId),
          sql`DATE(${schema.taskSessions.createdAt}) = ${targetDate}`,
        ),
      )
      .orderBy(desc(schema.taskSessions.createdAt));

    if (tasks.length === 0) {
      return {
        success: false,
        error: "no_tasks_found",
      };
    }

    // 各タスクのイベントを取得
    const tasksWithEvents = await Promise.all(
      tasks.map(async (task) => {
        const events = await db
          .select({
            eventType: schema.taskEvents.eventType,
            summary: schema.taskEvents.summary,
            reason: schema.taskEvents.reason,
            createdAt: schema.taskEvents.createdAt,
          })
          .from(schema.taskEvents)
          .where(eq(schema.taskEvents.taskSessionId, task.id))
          .orderBy(schema.taskEvents.createdAt);

        return {
          ...task,
          events,
        };
      }),
    );

    // journal コンテンツを生成
    const journalContent = generateJournalContent(tasksWithEvents, targetDate);

    // Google Drive にアップロード
    const uploadResult = await uploadFileToDrive({
      accessToken: connection.accessToken,
      fileName: `journal-${targetDate}.md`,
      content: journalContent,
      folderId: connection.folderId ?? undefined,
    });

    if (!uploadResult.webViewLink) {
      return {
        success: false,
        error: "upload_failed",
      };
    }

    return {
      success: true,
      webViewLink: uploadResult.webViewLink,
    };
  } catch (error) {
    console.error("Export journal error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "export_failed",
    };
  }
};
