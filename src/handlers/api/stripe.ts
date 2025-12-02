import { createHonoApp } from "@/app/create-app";

const app = createHonoApp();

// TODO: Implement Stripe webhook endpoint
app.post("/webhook", async (ctx) => {
  return ctx.json({ message: "Not implemented" }, 501);
});

// TODO: Implement checkout session creation
app.post("/checkout-session", async (ctx) => {
  return ctx.json({ message: "Not implemented" }, 501);
});

// TODO: Implement customer portal session creation
app.post("/portal-session", async (ctx) => {
  return ctx.json({ message: "Not implemented" }, 501);
});

// TODO: Implement get subscription
app.get("/subscription", async (ctx) => {
  return ctx.json({ message: "Not implemented" }, 501);
});

export default app;
