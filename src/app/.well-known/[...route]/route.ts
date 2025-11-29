import { handle } from "hono/vercel";
import { wellknownHandler } from "@/handlers/wellknown";

export const GET = handle(wellknownHandler);
