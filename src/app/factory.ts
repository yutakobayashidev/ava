import { Database, db } from "@/clients/drizzle"
import { createFactory } from "hono/factory"
import * as schema from "@/db/schema";

type User = typeof schema.users.$inferSelect;

// factory-with-db.ts
type Env = {
  Variables: {
    db: Database
    user: User
  }
}

export const createHonoApp = () => createFactory<Env>({
  initApp: (app) => {
    app.use(async (c, next) => {
      c.set('db', db)
      await next()
    })
  },
}).createApp()
