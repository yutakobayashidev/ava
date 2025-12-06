import type * as schema from "@ava/database/schema";

export type SubscriptionRepository = {
  /**
   * ユーザーのアクティブなサブスクリプションを取得
   */
  getActiveSubscription: (
    userId: string,
  ) => Promise<schema.Subscription | null>;

  /**
   * ユーザーが作成したタスクセッション数をカウント
   */
  countUserTaskSessions: (userId: string) => Promise<number>;
};
