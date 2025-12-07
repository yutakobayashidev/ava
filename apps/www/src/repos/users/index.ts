import type { Database } from "@ava/database/client";
import { users } from "@ava/database/schema";
import { and, eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import type { CreateUserRequest } from "./interface";

export * from "./interface";

// 高階関数として定義
const createUser = (db: Database) => async (request: CreateUserRequest) => {
  const [user] = await db
    .insert(users)
    .values({
      id: uuidv7(),
      name: request.name,
      email: request.email,
      slackId: request.slackId,
      slackTeamId: request.slackTeamId,
      image: request.image,
    })
    .returning();

  return user;
};

const findUserBySlackIdAndTeamId =
  (db: Database) => async (slackId: string, slackTeamId: string) => {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(eq(users.slackId, slackId), eq(users.slackTeamId, slackTeamId)),
      )
      .limit(1);
    return user || null;
  };

// ファクトリ関数で高階関数を使用
export const createUserRepository = (db: Database) => ({
  createUser: createUser(db),
  findUserBySlackIdAndTeamId: findUserBySlackIdAndTeamId(db),
});
