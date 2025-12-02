import { createHonoApp } from "@/app/create-app";

const app = createHonoApp()
  // TODO: Implement Stripe webhook endpoint
  .post("/webhook", async (ctx) => {
    return ctx.json({ message: "Not implemented" }, 501);
  })
  // TODO: Implement checkout session creation
  .post("/checkout", async (ctx) => {
    return ctx.json({ message: "Not implemented" }, 501);
  })
  // TODO: Implement customer portal session creation
  .post("/portal-session", async (ctx) => {
    return ctx.json({ message: "Not implemented" }, 501);
  })
  // TODO: Implement get subscription
  .get("/subscription", async (ctx) => {
    return ctx.json({ message: "Not implemented" }, 501);
  });

export default app;
