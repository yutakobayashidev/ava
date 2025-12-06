import { createHonoApp } from "@/create-app";

const app = createHonoApp();

app.get("/", async (c) => {
  return c.json({ status: "ok" });
});

export default app;
