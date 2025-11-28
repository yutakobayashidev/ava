import { neon } from "@neondatabase/serverless";
import * as schema from "../db/schema";
import { drizzle } from "drizzle-orm/neon-serverless"
import { neonConfig } from "@neondatabase/serverless"
import ws from "ws"

neonConfig.webSocketConstructor = ws

export const db = drizzle(process.env.DATABASE_URL!, { schema })

export type Database = typeof db;
