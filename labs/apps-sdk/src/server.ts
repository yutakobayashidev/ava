import "dotenv/config";
import { serve } from "@hono/node-server";
import app from "./server/app.js";

const port = Number(process.env.PORT ?? 3000);

serve({
  fetch: app.fetch,
  port,
});

export default app;
