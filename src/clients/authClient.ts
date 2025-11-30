import { AuthRoute } from "@/handlers/api/auth";
import { hc } from "hono/client";
import { absoluteUrl } from "@/lib/utils";

export const authClient = hc<AuthRoute>(absoluteUrl("/api/auth"));
