import { createHonoApp, getUsecaseContext } from "@/app/create-app";
import { getCookie } from "hono/cookie";
import { validateSessionToken } from "@/lib/session";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { env } from "hono/adapter";
import { absoluteUrl } from "@/lib/utils";
import { HTTPException } from "hono/http-exception";

const app = createHonoApp()
  // TODO: Implement Stripe webhook endpoint
  .post("/webhook", async (ctx) => {
    return ctx.json({ message: "Not implemented" }, 501);
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

    const { STRIPE_PRICE_ID } = env(ctx);

    if (!STRIPE_PRICE_ID) {
      throw new HTTPException(500, {
        message: "Stripe price ID not configured",
      });
    }

    const successUrl = absoluteUrl("/billing/success");
    const cancelUrl = absoluteUrl("/billing");

    const customer = await stripe.customers.create({
      email: me.email,
      name: me.name ?? "-",
    });

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      automatic_tax: {
        enabled: true,
      },
      customer: customer.id,
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

    await db
      .update(users)
      .set({ stripeId: customer.id })
      .where(eq(users.id, me.id));

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
  // TODO: Implement get subscription
  .get("/subscription", async (ctx) => {
    return ctx.json({ message: "Not implemented" }, 501);
  });

export default app;
