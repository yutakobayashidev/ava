import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { cors } from "hono/cors";
import {
    StreamableHTTPTransport,
} from "@hono/mcp";
import mcp from "../mcp";
import oauthRoutes from "./oauth"
const transport = new StreamableHTTPTransport();

const app = new Hono().use(
    cors({
        origin: (origin) => origin,
        credentials: true,
    }),
);

app.route("/", oauthRoutes)

app.all(
    "/mcp",
    async (c) => {
        if (!mcp.isConnected()) {
            await mcp.connect(transport);
        }

        return transport.handleRequest(c);
    },
);
export const GET = handle(app);
export const POST = handle(app);
export const OPTIONS = handle(app);
