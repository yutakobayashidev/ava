import { handle } from "hono/vercel";
import { mcpHandler } from "@/handlers/mcp";

export const GET = handle(mcpHandler);
export const POST = handle(mcpHandler);
export const OPTIONS = handle(mcpHandler);
