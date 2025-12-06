export type UserProvider = "slack";

export type CreateUserRequest = {
  provider: UserProvider;
  externalId: string;
  name: string;
  email: string;
  slackId: string;
  slackTeamId: string;
  image?: string;
};
