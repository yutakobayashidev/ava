import { test as setup } from "../fixtures";
import { user1 } from "../dummyUsers";
import { createUserAuthState, registerUserToDB } from "../helpers/users";

setup("Create user1 auth", async ({ context, setup: setupFixture }) => {
  await registerUserToDB(user1, setupFixture.dbURL);
  await createUserAuthState(context, user1, setupFixture.dbURL);
});
