import type Stripe from "stripe";
import { users, subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Env } from "@/app/create-app";

export async function handleSubscriptionUpsert(
  db: Env["Variables"]["db"],
  subscription: Stripe.Subscription,
) {
  return await db.transaction(async (tx) => {
    const user = await tx.query.users.findFirst({
      where: eq(users.stripeId, `${subscription.customer}`),
    });

    if (!user) {
      console.warn(`No user found for subscription ${subscription.id}`);
      return;
    }

    // support only one subscription for now
    const item = subscription.items.data[0];
    const currentPeriodEnd = new Date(item.current_period_end * 1000);
    const { id, status, cancel_at_period_end } = subscription;

    const existingSubscription = await tx.query.subscriptions.findFirst({
      where: eq(subscriptions.subscriptionId, subscription.id),
    });

    if (existingSubscription) {
      const [updated] = await tx
        .update(subscriptions)
        .set({
          subscriptionId: id,
          status,
          currentPeriodEnd,
          cancelAtPeriodEnd: cancel_at_period_end,
        })
        .where(eq(subscriptions.subscriptionId, subscription.id))
        .returning();
      return updated;
    } else {
      const [created] = await tx
        .insert(subscriptions)
        .values({
          id: `sub_${Date.now()}`,
          userId: user.id,
          subscriptionId: id,
          status,
          currentPeriodEnd,
          cancelAtPeriodEnd: cancel_at_period_end,
        })
        .returning();
      return created;
    }
  });
}
