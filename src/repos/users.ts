import { eq } from "drizzle-orm";
import type { Database } from "@/clients/drizzle";
import { users } from "@/db/schema";

export type UserRepository = ReturnType<typeof createUserRepository>;

export const createUserRepository = ({ db }: { db: Database }) => ({
  async findUserBySlackId(slackId: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.slackId, slackId))
      .limit(1);
    return user || null;
  },
});
