import { createHonoApp, getUsecaseContext } from "@/app/create-app";
import { getCookie } from "hono/cookie";
import { validateSessionToken } from "@/lib/session";
import { users, subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { env } from "hono/adapter";
import { absoluteUrl } from "@/lib/utils";
import { HTTPException } from "hono/http-exception";
import { handleSubscriptionUpsert } from "@/usecases/stripe/handleSubscriptionUpsert";
import type Stripe from "stripe";

const app = createHonoApp()
  .post("/webhook", async (ctx) => {
    const { STRIPE_WEBHOOK_SECRET } = env(ctx);
    const { stripe, db } = getUsecaseContext(ctx);

    const signature = ctx.req.header("stripe-signature");

    try {
      if (!signature) {
        return ctx.text("", 400);
      }

      const body = await ctx.req.text();
      const event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        STRIPE_WEBHOOK_SECRET,
      );

      switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.deleted":
        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;

          try {
            await handleSubscriptionUpsert(db, subscription);
          } catch (error) {
            console.error("Error upserting subscription:", error);
            return ctx.text("Error upserting subscription", 500);
          }
          break;
        }

        case "customer.deleted": {
          const customer = event.data.object as Stripe.Customer;

          try {
            await db.transaction(async (tx) => {
              const user = await tx.query.users.findFirst({
                where: eq(users.stripeId, customer.id),
              });

              if (user) {
                await tx
                  .delete(subscriptions)
                  .where(eq(subscriptions.userId, user.id));
                await tx
                  .update(users)
                  .set({ stripeId: null })
                  .where(eq(users.id, user.id));
              }
            });
          } catch (error) {
            console.error("Error deleting customer:", error);
            return ctx.text("Error deleting customer", 500);
          }
          break;
        }

        default: {
          console.log(`Unhandled event type: ${event.type}`);
        }
      }

      return ctx.text("", 200);
    } catch (err) {
      const errorMessage = `⚠️  Webhook signature verification failed. ${
        err instanceof Error ? err.message : "Internal server error"
      }`;
      console.log(errorMessage);
      return ctx.text(errorMessage, 400);
    }
  })
  .post("/checkout", async (ctx) => {
    const sessionToken = getCookie(ctx, "session");
    const { user } = sessionToken
      ? await validateSessionToken(sessionToken)
      : { user: null };

    if (!user) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const { db, stripe } = getUsecaseContext(ctx);

    const me = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!me?.email) {
      throw new HTTPException(404, { message: "user not found" });
    }

    // Get price by lookup key
    const prices = await stripe.prices.list({
      lookup_keys: ["basic_monthly"],
      limit: 1,
    });

    const price = prices.data[0];

    if (!price) {
      throw new HTTPException(500, {
        message: "Price not found for lookup key: basic_monthly",
      });
    }

    const successUrl = absoluteUrl("/billing/success");
    const cancelUrl = absoluteUrl("/billing");

    // Get or create Stripe customer with transaction lock to prevent race conditions
    const { stripeId } = await db.transaction(async (tx) => {
      // Lock the user row to prevent concurrent customer creation
      const [lockedUser] = await tx
        .select()
        .from(users)
        .where(eq(users.id, me.id))
        .for("update");

      if (!lockedUser) {
        throw new HTTPException(404, { message: "user not found" });
      }

      // If stripeId already exists, return it
      if (lockedUser.stripeId) {
        return { stripeId: lockedUser.stripeId };
      }

      // Create Stripe customer
      try {
        const customer = await stripe.customers.create({
          email: lockedUser.email!,
          name: lockedUser.name ?? "-",
        });

        // Update user with stripeId
        await tx
          .update(users)
          .set({ stripeId: customer.id })
          .where(eq(users.id, lockedUser.id));

        return { stripeId: customer.id };
      } catch (error) {
        console.error("Failed to create stripe customer:", error);
        throw new HTTPException(500, {
          message: "Failed to create stripe customer",
        });
      }
    });

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      automatic_tax: {
        enabled: true,
      },
      customer: stripeId,
      customer_update: {
        shipping: "auto",
      },
      shipping_address_collection: {
        allowed_countries: ["JP"],
      },
      currency: "jpy",
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (!checkoutSession.url) {
      throw new HTTPException(500, {
        message: "checkoutSession url not found",
      });
    }

    return ctx.redirect(checkoutSession.url);
  })
  .post("/portal-session", async (ctx) => {
    const sessionToken = getCookie(ctx, "session");
    const { user } = sessionToken
      ? await validateSessionToken(sessionToken)
      : { user: null };

    if (!user) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const { db, stripe } = getUsecaseContext(ctx);

    const me = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!me?.stripeId) {
      throw new HTTPException(404, { message: "user not found" });
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: me.stripeId,
      return_url: absoluteUrl("/billing"),
    });

    return ctx.redirect(portal.url);
  })
  .get("/subscription", async (ctx) => {
    const sessionToken = getCookie(ctx, "session");
    const { user } = sessionToken
      ? await validateSessionToken(sessionToken)
      : { user: null };

    if (!user) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const { db } = getUsecaseContext(ctx);

    const subscription = await db.query.subscriptions.findFirst({
      where: (subscriptions, { eq, and, inArray }) =>
        and(
          eq(subscriptions.userId, user.id),
          inArray(subscriptions.status, ["active", "complete"]),
        ),
    });

    if (!subscription) {
      return ctx.json({
        success: true,
        data: null,
        message: "subscription not found",
      });
    }

    return ctx.json({
      success: true,
      data: {
        subscriptionId: subscription.subscriptionId,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    });
  });

export default app;
