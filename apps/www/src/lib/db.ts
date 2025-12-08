import { InternalServerError } from "@/errors";
import { DrizzleError } from "drizzle-orm";
import { ResultAsync, fromPromise } from "neverthrow";

export class DatabaseError extends InternalServerError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "DatabaseError";
  }
}

export const wrapDrizzle = <T>(
  query: Promise<T>,
): ResultAsync<T, DatabaseError> =>
  fromPromise(query, (error) =>
    error instanceof DrizzleError
      ? new DatabaseError(error.message, error)
      : new DatabaseError("Unknown error", error),
  );
