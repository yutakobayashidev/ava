import { and, eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import type { Database } from "@ava/database/client";
import { users } from "@ava/database/schema";

type UserProvider = "slack";

type CreateUserInput = {
  provider: UserProvider;
  externalId: string;
  name: string;
  email: string;
  slackId: string;
  slackTeamId: string;
  image?: string;
};

export const createUserRepository = ({ db }: { db: Database }) => ({
  async createUser(input: CreateUserInput) {
    const [user] = await db
      .insert(users)
      .values({
        id: uuidv7(),
        name: input.name,
        email: input.email,
        slackId: input.slackId,
        slackTeamId: input.slackTeamId,
        image: input.image,
      })
      .returning();

    return user;
  },
  async findUserBySlackIdAndTeamId(slackId: string, slackTeamId: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(eq(users.slackId, slackId), eq(users.slackTeamId, slackTeamId)),
      )
      .limit(1);
    return user || null;
  },
});
