import { test as setup } from "../fixtures";
import { user1, workspace1 } from "../dummyUsers";
import { createUserAuthState, registerUserToDB } from "../helpers/users";
import { generateDrizzleClient } from "../helpers/drizzle";
import { createWorkspaceRepository } from "@/repos";

setup("Create user1 auth", async ({ context, setup: setupFixture }) => {
  // ワークスペースを先に作成
  await using drizzle = await generateDrizzleClient(setupFixture.dbURL);
  const workspaceRepository = createWorkspaceRepository({ db: drizzle.db });
  const workspace = await workspaceRepository.createWorkspace(workspace1);

  // ユーザーを作成
  await registerUserToDB(user1, setupFixture.dbURL);

  // ワークスペースを紐付け
  await workspaceRepository.setUserWorkspace(user1.id, workspace.id);

  await createUserAuthState(context, user1, setupFixture.dbURL);
});
