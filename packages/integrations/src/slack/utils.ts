import { WebClient } from "@slack/web-api";

export const createWebClient = (token?: string): WebClient => {
  return new WebClient(token);
};
