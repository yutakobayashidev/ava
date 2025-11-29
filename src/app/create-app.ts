import { Database, db } from "@/clients/drizzle"
import { createFactory } from "hono/factory"
import * as schema from "@/db/schema";

export type Env = {
  Variables: {
    db: Database
    user: schema.User
    workspace: schema.Workspace
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
