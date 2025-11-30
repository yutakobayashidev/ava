import { test as setup } from "../fixtures";
import { UserBuilder } from "../builders";
import { createUserAuthState, registerUserToDB } from "../helpers/users";

setup("Create user1 auth", async ({ context, setup: setupFixture }) => {
  const user1 = new UserBuilder().build();
  await registerUserToDB(user1, setupFixture.dbURL);
  await createUserAuthState(context, user1, setupFixture.dbURL);
});

setup(
  "Create onboarding_user auth",
  async ({ context, setup: setupFixture }) => {
    const onboardingUser = new UserBuilder()
      .withId("onboarding_user")
      .withEmail("onboarding@example.com")
      .withSlackId("U_ONBOARDING")
      .withoutOnboardingCompleted()
      .build();

    await registerUserToDB(onboardingUser, setupFixture.dbURL);
    await createUserAuthState(context, onboardingUser, setupFixture.dbURL);
  },
);
