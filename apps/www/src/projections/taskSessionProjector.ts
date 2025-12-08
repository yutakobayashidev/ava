import type { Event } from "@/objects/task/types";
import type { Database } from "@ava/database/client";
import * as schema from "@ava/database/schema";
import { and, eq } from "drizzle-orm";

type ProjectContext = {
  workspaceId: string;
  userId: string;
};

export async function projectTaskEvents(
  db: Database,
  streamId: string,
  events: Event[],
  context: ProjectContext,
) {
  for (const event of events) {
    switch (event.type) {
      case "TaskStarted": {
        await db.insert(schema.taskSessions).values({
          id: streamId,
          userId: context.userId,
          workspaceId: context.workspaceId,
          issueProvider: event.payload.issue.provider,
          issueId: event.payload.issue.id ?? null,
          issueTitle: event.payload.issue.title,
          initialSummary: event.payload.initialSummary,
          status: "in_progress",
          createdAt: event.payload.occurredAt,
          updatedAt: event.payload.occurredAt,
        });
        break;
      }
      case "TaskUpdated": {
        await db
          .update(schema.taskSessions)
          .set({ status: "in_progress", updatedAt: event.payload.occurredAt })
          .where(eq(schema.taskSessions.id, streamId));
        break;
      }
      case "TaskBlocked": {
        await db
          .update(schema.taskSessions)
          .set({ status: "blocked", updatedAt: event.payload.occurredAt })
          .where(eq(schema.taskSessions.id, streamId));
        break;
      }
      case "BlockResolved": {
        await db
          .update(schema.taskSessions)
          .set({ status: "in_progress", updatedAt: event.payload.occurredAt })
          .where(eq(schema.taskSessions.id, streamId));
        break;
      }
      case "TaskPaused": {
        await db
          .update(schema.taskSessions)
          .set({ status: "paused", updatedAt: event.payload.occurredAt })
          .where(eq(schema.taskSessions.id, streamId));
        break;
      }
      case "TaskResumed": {
        await db
          .update(schema.taskSessions)
          .set({ status: "in_progress", updatedAt: event.payload.occurredAt })
          .where(eq(schema.taskSessions.id, streamId));
        break;
      }
      case "TaskCompleted": {
        await db
          .update(schema.taskSessions)
          .set({ status: "completed", updatedAt: event.payload.occurredAt })
          .where(eq(schema.taskSessions.id, streamId));
        break;
      }
      case "SlackThreadLinked": {
        await db
          .update(schema.taskSessions)
          .set({
            slackChannel: event.payload.channel,
            slackThreadTs: event.payload.threadTs,
          })
          .where(
            and(
              eq(schema.taskSessions.id, streamId),
              eq(schema.taskSessions.workspaceId, context.workspaceId),
              eq(schema.taskSessions.userId, context.userId),
            ),
          );
        break;
      }
      case "TaskCancelled": {
        await db
          .update(schema.taskSessions)
          .set({ status: "cancelled", updatedAt: event.payload.occurredAt })
          .where(eq(schema.taskSessions.id, streamId));
        break;
      }
      default:
        break;
    }
  }
}
