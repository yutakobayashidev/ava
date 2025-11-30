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

  // ユーザーを作成（workspaceIdを上書き）
  const userWithWorkspace = { ...user1, workspaceId: workspace.id };
  await registerUserToDB(userWithWorkspace, setupFixture.dbURL);
  await createUserAuthState(context, userWithWorkspace, setupFixture.dbURL);
});
