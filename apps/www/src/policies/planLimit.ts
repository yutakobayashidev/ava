import type { SubscriptionRepository } from "@/repos/subscriptions";
import { PaymentRequiredError } from "@/errors";
import { absoluteUrl } from "@/lib/utils";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { DatabaseError } from "@/lib/db";

const FREE_PLAN_LIMIT = 5;

/**
 * 無料プランの制限をチェック
 */
export const checkFreePlanLimitResult = (
  userId: string,
  subscriptionRepo: SubscriptionRepository,
): ResultAsync<void, PaymentRequiredError | DatabaseError> => {
  return ResultAsync.combine([
    subscriptionRepo.getActiveSubscription(userId),
    subscriptionRepo.countUserTaskSessions(userId),
  ]).andThen(([activeSubscription, sessionCount]) => {
    // サブスクリプションがあれば制限なし
    if (activeSubscription) {
      return okAsync(undefined);
    }

    // 無料プランの場合、セッション数をチェック
    if (sessionCount >= FREE_PLAN_LIMIT) {
      return errAsync(
        new PaymentRequiredError(
          `無料プランの制限（${FREE_PLAN_LIMIT}セッション）に達しました。引き続きご利用いただくには、有料プランへのアップグレードをお願いします。\n詳細: ${absoluteUrl("/docs/pricing")}`,
        ),
      );
    }

    return okAsync(undefined);
  });
};
