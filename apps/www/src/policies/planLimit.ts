import type { SubscriptionRepository } from "@/repos/subscriptions";
import { absoluteUrl } from "@/lib/utils";
import { ResultAsync } from "neverthrow";
import { DatabaseError } from "@/lib/db";
import { PlanLimitError } from "@/usecases/taskSessions/errors";

const FREE_PLAN_LIMIT = 5;

/**
 * 無料プランの制限をチェック
 */
export const checkFreePlanLimitResult = (
  userId: string,
  subscriptionRepo: SubscriptionRepository,
): ResultAsync<void, PlanLimitError | DatabaseError> => {
  return ResultAsync.fromPromise(
    (async () => {
      // アクティブなサブスクリプションがあるかチェック
      const activeSubscription =
        await subscriptionRepo.getActiveSubscription(userId);

      // サブスクリプションがあれば制限なし
      if (activeSubscription) {
        return;
      }

      // 無料プランの場合、セッション数をチェック
      const sessionCount = await subscriptionRepo.countUserTaskSessions(userId);

      if (sessionCount >= FREE_PLAN_LIMIT) {
        throw new PlanLimitError(
          `無料プランの制限（${FREE_PLAN_LIMIT}セッション）に達しました。引き続きご利用いただくには、有料プランへのアップグレードをお願いします。\n詳細: ${absoluteUrl("/docs/pricing")}`,
        );
      }
    })(),
    (error) => {
      if (error instanceof PlanLimitError) {
        return error;
      }
      return new DatabaseError(
        error instanceof Error ? error.message : "Failed to check plan limit",
        error,
      );
    },
  );
};
