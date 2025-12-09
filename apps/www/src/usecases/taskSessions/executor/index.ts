import { BadRequestError, NotFoundError } from "@/errors";
import { DatabaseError } from "@/lib/db";
import type { replay } from "@/objects/task/decider";
import type { Command, Event } from "@/objects/task/types";
import { createEventStore } from "@/repos/event-store";
import type { HonoEnv } from "@/types";
import type { Database } from "@ava/database/client";
import type * as schema from "@ava/database/schema";
import { ok, ResultAsync } from "neverthrow";
import { commitEvents, decideEvents, loadEvents, projectEvents } from "./steps";
import type { UnloadedCommand } from "./types";

export const createTaskExecuteCommand = (db: Database) => {
  const eventStore = createEventStore(db);

  return (params: {
    streamId: string;
    workspace: HonoEnv["Variables"]["workspace"];
    user: HonoEnv["Variables"]["user"];
    command: Command;
  }): ResultAsync<
    {
      events: Event[];
      persistedEvents: schema.TaskEvent[];
      state: ReturnType<typeof replay>;
      version: number;
    },
    DatabaseError | BadRequestError | NotFoundError
  > => {
    const command: UnloadedCommand = {
      kind: "unloaded",
      ...params,
    };

    return ok(command)
      .asyncAndThen(loadEvents(eventStore))
      .andThen(decideEvents)
      .andThen(commitEvents(eventStore))
      .andThen(projectEvents(db))
      .map((result) => ({
        events: result.events,
        persistedEvents: result.persistedEvents,
        state: result.state,
        version: result.version,
      }));
  };
};

export type TaskExecuteCommand = ReturnType<typeof createTaskExecuteCommand>;
