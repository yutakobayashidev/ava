import { AuthRoute } from "@/handlers/api/auth";
import { hc } from "hono/client";

export const authClient = hc<AuthRoute>(
  `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth`,
);
