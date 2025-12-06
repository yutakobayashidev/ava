import { createHonoApp } from "@/app/create-app";

const app = createHonoApp();

app.get("/", async (c) => {
  return c.json({ status: "ok" });
});

export default app;
