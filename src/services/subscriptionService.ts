import type { SubscriptionRepository } from "@/repos/subscriptions";

const FREE_PLAN_LIMIT = 5;

/**
 * 無料プランの制限をチェック
 * @returns エラーメッセージ。制限内ならnull
 */
export async function checkFreePlanLimit(
  userId: string,
  subscriptionRepo: SubscriptionRepository,
): Promise<string | null> {
  // アクティブなサブスクリプションがあるかチェック
  const activeSubscription =
    await subscriptionRepo.getActiveSubscription(userId);

  // サブスクリプションがあれば制限なし
  if (activeSubscription) {
    return null;
  }

  // 無料プランの場合、セッション数をチェック
  const sessionCount = await subscriptionRepo.countUserTaskSessions(userId);

  if (sessionCount >= FREE_PLAN_LIMIT) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    return `無料プランの制限（${FREE_PLAN_LIMIT}セッション）に達しました。引き続きご利用いただくには、有料プランへのアップグレードをお願いします。\n詳細: ${baseUrl}/pricing`;
  }

  return null;
}
