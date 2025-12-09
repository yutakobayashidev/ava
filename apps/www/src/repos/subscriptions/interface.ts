import type { DatabaseError } from "@/lib/db";
import type { ResultAsync } from "neverthrow";
import type * as schema from "@ava/database/schema";

export type SubscriptionRepository = {
  /**
   * ユーザーのアクティブなサブスクリプションを取得
   */
  getActiveSubscription: (
    userId: string,
  ) => ResultAsync<schema.Subscription | null, DatabaseError>;

  /**
   * ユーザーが作成したタスクセッション数をカウント
   */
  countUserTaskSessions: (userId: string) => ResultAsync<number, DatabaseError>;
};
