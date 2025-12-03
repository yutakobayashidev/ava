import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import type { Database } from "../clients/drizzle";
import * as schema from "../db/schema";

type GoogleDriveConnectionRepositoryDeps = {
  db: Database;
};

type CreateConnectionInput = {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  folderId?: string | null;
  folderName?: string | null;
};

type UpdateConnectionInput = {
  userId: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  folderId?: string | null;
  folderName?: string | null;
};

export const createGoogleDriveConnectionRepository = ({
  db,
}: GoogleDriveConnectionRepositoryDeps) => {
  const createConnection = async (input: CreateConnectionInput) => {
    const [connection] = await db
      .insert(schema.googleDriveConnections)
      .values({
        id: uuidv7(),
        userId: input.userId,
        email: input.email,
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        expiresAt: input.expiresAt,
        folderId: input.folderId ?? null,
        folderName: input.folderName ?? null,
      })
      .returning();

    return connection;
  };

  const findConnectionByUserId = async (userId: string) => {
    const [connection] = await db
      .select()
      .from(schema.googleDriveConnections)
      .where(eq(schema.googleDriveConnections.userId, userId));

    return connection ?? null;
  };

  const updateConnection = async (input: UpdateConnectionInput) => {
    const updates: Partial<schema.NewGoogleDriveConnection> = {};

    if (input.accessToken !== undefined) {
      updates.accessToken = input.accessToken;
    }

    if (input.refreshToken !== undefined) {
      updates.refreshToken = input.refreshToken;
    }

    if (input.expiresAt !== undefined) {
      updates.expiresAt = input.expiresAt;
    }

    if (input.folderId !== undefined) {
      updates.folderId = input.folderId;
    }

    if (input.folderName !== undefined) {
      updates.folderName = input.folderName;
    }

    if (Object.keys(updates).length === 0) {
      return findConnectionByUserId(input.userId);
    }

    const [connection] = await db
      .update(schema.googleDriveConnections)
      .set(updates)
      .where(eq(schema.googleDriveConnections.userId, input.userId))
      .returning();

    return connection ?? null;
  };

  const deleteConnection = async (userId: string) => {
    await db
      .delete(schema.googleDriveConnections)
      .where(eq(schema.googleDriveConnections.userId, userId));
  };

  return {
    createConnection,
    findConnectionByUserId,
    updateConnection,
    deleteConnection,
  };
};

export type GoogleDriveConnectionRepository = ReturnType<
  typeof createGoogleDriveConnectionRepository
>;
export type { CreateConnectionInput, UpdateConnectionInput };
