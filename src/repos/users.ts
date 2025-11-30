import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import type { Database } from "@/clients/drizzle";
import { users } from "@/db/schema";

type UserProvider = "slack";

export type CreateUserInput = {
  provider: UserProvider;
  externalId: string;
  name: string;
  email: string;
  slackId: string;
  image?: string;
};

export type UserRepository = ReturnType<typeof createUserRepository>;

export const createUserRepository = ({ db }: { db: Database }) => ({
  async createUser(input: CreateUserInput) {
    const [user] = await db
      .insert(users)
      .values({
        id: uuidv7(),
        name: input.name,
        email: input.email,
        slackId: input.slackId,
        image: input.image,
      })
      .returning();

    return user;
  },
  async findUserBySlackId(slackId: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.slackId, slackId))
      .limit(1);
    return user || null;
  },
});
