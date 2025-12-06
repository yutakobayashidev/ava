import type { Block, ModalView } from "@slack/web-api";

export type SlackChannel = {
  id: string;
  name: string;
  isPrivate: boolean;
};

export type PostMessageParams = {
  token: string;
  channel: string;
  text: string;
  threadTs?: string;
  blocks?: Block[];
};

export type PostMessageResult = {
  channel: string;
  ts: string | undefined;
};

export type AddReactionParams = {
  token: string;
  channel: string;
  timestamp: string;
  name: string;
};

export type OpenModalParams = {
  token: string;
  triggerId: string;
  view: ModalView;
};

export type RotatedTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
};

export type TokenRotationParams = {
  botRefreshToken: string | null;
  botTokenExpiresAt: Date | null;
  clientId: string;
  clientSecret: string;
  minutesBeforeExpiration?: number;
};

export type SlackOAuthResult = {
  accessToken: string;
  refreshToken: string | undefined;
  expiresIn: number | undefined;
  expiresAt: Date | null;
  botUserId: string | undefined;
  teamId: string;
  teamName: string;
  teamDomain: string | undefined;
  scope: string | undefined;
};
