import type { SubscriptionRepository } from "@/repos/subscriptions";
import { absoluteUrl } from "@/lib/utils";
import { ResultAsync } from "neverthrow";
import { InternalServerError } from "@/errors";

const FREE_PLAN_LIMIT = 5;

/**
 * 無料プランの制限をチェック
 * @returns Ok(undefined)で制限内、Err(InternalServerError)で制限超過
 */
export function checkFreePlanLimit(
  userId: string,
  subscriptionRepo: SubscriptionRepository,
): ResultAsync<undefined, InternalServerError> {
  return ResultAsync.fromPromise(
    (async () => {
      // アクティブなサブスクリプションがあるかチェック
      const activeSubscription =
        await subscriptionRepo.getActiveSubscription(userId);

      // サブスクリプションがあれば制限なし
      if (activeSubscription) {
        return undefined;
      }

      // 無料プランの場合、セッション数をチェック
      const sessionCount = await subscriptionRepo.countUserTaskSessions(userId);

      if (sessionCount >= FREE_PLAN_LIMIT) {
        throw new InternalServerError(
          `無料プランの制限（${FREE_PLAN_LIMIT}セッション）に達しました。引き続きご利用いただくには、有料プランへのアップグレードをお願いします。\n詳細: ${absoluteUrl("/docs/pricing")}`,
        );
      }

      return undefined;
    })(),
    (error) => {
      if (error instanceof InternalServerError) {
        return error;
      }
      return new InternalServerError("Subscription check failed", error);
    },
  );
}
