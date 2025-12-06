import type { Database } from "@ava/database/client";
import { subscriptions, taskSessions } from "@ava/database/schema";
import { and, eq, sql } from "drizzle-orm";

export type SubscriptionRepository = ReturnType<
  typeof createSubscriptionRepository
>;

export const createSubscriptionRepository = (db: Database) => ({
  /**
   * ユーザーのアクティブなサブスクリプションを取得
   */
  async getActiveSubscription(userId: string) {
    const activeSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active"),
        ),
      )
      .limit(1);

    return activeSubscriptions[0] ?? null;
  },

  /**
   * ユーザーが作成したタスクセッション数をカウント
   */
  async countUserTaskSessions(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(taskSessions)
      .where(eq(taskSessions.userId, userId));

    return result[0]?.count ?? 0;
  },
});
