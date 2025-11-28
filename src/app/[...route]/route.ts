import { handle } from 'hono/vercel'
import { cors } from "hono/cors";
import {
    StreamableHTTPTransport,
} from "@hono/mcp";
import { createMcpServer } from "../mcp";
import oauthRoutes from "../../routes/oauth"
import authRoutes from "../../routes/auth"
import { oauthMiddleware } from '@/middleware/oauth';
import { createHonoApp } from '../factory';

const app = createHonoApp.use(
    cors({
        origin: (origin) => origin,
        credentials: true,
    }),
);

app.route("/", oauthRoutes)
app.route("/login", authRoutes)

app.all(
    "/mcp",
    oauthMiddleware,
    async (c) => {
        const user = c.get('user');
        const mcp = createMcpServer(user);
        const transport = new StreamableHTTPTransport();

        await mcp.connect(transport);

        return transport.handleRequest(c);
    },
);
export const GET = handle(app);
export const POST = handle(app);
export const OPTIONS = handle(app);
