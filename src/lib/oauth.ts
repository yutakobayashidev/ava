import { Slack } from "arctic";
import { absoluteUrl } from "./utils";

export const slack = new Slack(
  process.env.SLACK_APP_CLIENT_ID!,
  process.env.SLACK_APP_CLIENT_SECRET,
  absoluteUrl("/api/login/slack/callback"),
);
