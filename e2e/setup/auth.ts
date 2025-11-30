import { test as setup } from "../fixtures";
import { user1, workspace1 } from "../dummyUsers";
import { createUserAuthState, registerUserToDB } from "../helpers/users";
import { generateDrizzleClient } from "../helpers/drizzle";
import { setupWorkspaceForUser } from "../helpers/workspace";

setup("Create user1 auth", async ({ context, setup: setupFixture }) => {
  // ユーザーを作成
  await registerUserToDB(user1, setupFixture.dbURL);

  // ワークスペースを作成してユーザーに紐付け
  await using drizzle = await generateDrizzleClient(setupFixture.dbURL);
  await setupWorkspaceForUser(drizzle.db, user1, workspace1);

  await createUserAuthState(context, user1, setupFixture.dbURL);
});
