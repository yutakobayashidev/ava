import type { User } from "@/db/schema";

export class UserBuilder {
  private user: User;

  constructor(base?: Partial<User>) {
    this.user = {
      id: "john_doe",
      name: "John Doe",
      email: "john@example.com",
      slackId: "U01234ABCDE",
      image: "https://example.com/avatar.jpg",
      onboardingCompletedAt: new Date("2024-01-01T00:00:00Z"),
      createdAt: new Date("2024-01-01T00:00:00Z"),
      ...base,
    };
  }

  withoutOnboardingCompleted(): this {
    this.user.onboardingCompletedAt = null;
    return this;
  }

  withId(id: string): this {
    this.user.id = id;
    return this;
  }

  withEmail(email: string): this {
    this.user.email = email;
    return this;
  }

  withSlackId(slackId: string): this {
    this.user.slackId = slackId;
    return this;
  }

  build(): User {
    return this.user;
  }
}
