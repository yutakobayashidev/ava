import "server-only";

import { google } from "googleapis";
import { absoluteUrl } from "./utils";

const GOOGLE_OAUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

const DEFAULT_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
];

export const googleDriveConfig = {
  clientId: process.env.GOOGLE_DRIVE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET!,
  redirectUri: absoluteUrl("/api/google-drive/connect/callback"),
  scopes: DEFAULT_SCOPES,
} as const;

export const buildGoogleDriveAuthUrl = (state: string): string => {
  const url = new URL(GOOGLE_OAUTH_ENDPOINT);
  url.searchParams.set("client_id", googleDriveConfig.clientId);
  url.searchParams.set("redirect_uri", googleDriveConfig.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", googleDriveConfig.scopes.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  return url.toString();
};

export const exchangeGoogleDriveCode = async (code: string) => {
  const oauth2Client = new google.auth.OAuth2(
    googleDriveConfig.clientId,
    googleDriveConfig.clientSecret,
    googleDriveConfig.redirectUri,
  );

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token) {
    throw new Error("No access token returned from Google");
  }

  if (!tokens.refresh_token) {
    throw new Error("No refresh token returned from Google");
  }

  oauth2Client.setCredentials(tokens);

  // Get user email
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();

  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : new Date(Date.now() + 3600 * 1000); // Default 1 hour

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt,
    email: userInfo.data.email ?? "unknown",
  };
};

export const refreshGoogleDriveToken = async (refreshToken: string) => {
  const oauth2Client = new google.auth.OAuth2(
    googleDriveConfig.clientId,
    googleDriveConfig.clientSecret,
    googleDriveConfig.redirectUri,
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error("Failed to refresh access token");
  }

  const expiresAt = credentials.expiry_date
    ? new Date(credentials.expiry_date)
    : new Date(Date.now() + 3600 * 1000);

  return {
    accessToken: credentials.access_token,
    expiresAt,
  };
};

type UploadFileParams = {
  accessToken: string;
  fileName: string;
  content: string;
  mimeType?: string;
  folderId?: string;
};

export const uploadFileToDrive = async (params: UploadFileParams) => {
  const {
    accessToken,
    fileName,
    content,
    mimeType = "text/markdown",
    folderId,
  } = params;

  const oauth2Client = new google.auth.OAuth2(
    googleDriveConfig.clientId,
    googleDriveConfig.clientSecret,
    googleDriveConfig.redirectUri,
  );

  oauth2Client.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: "v3", auth: oauth2Client });

  const fileMetadata: {
    name: string;
    mimeType: string;
    parents?: string[];
  } = {
    name: fileName,
    mimeType,
  };

  if (folderId) {
    fileMetadata.parents = [folderId];
  }

  const media = {
    mimeType,
    body: content,
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id, name, webViewLink",
  });

  return {
    fileId: response.data.id ?? undefined,
    fileName: response.data.name ?? fileName,
    webViewLink: response.data.webViewLink ?? undefined,
  };
};
