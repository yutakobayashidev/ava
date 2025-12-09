import { createEventStore } from "@/repos/event-store";
import type { Database } from "@ava/database/client";
import { ok } from "neverthrow";
import type { TaskExecuteCommand } from "../interface";
import { commitEvents, decideEvents, loadEvents, projectEvents } from "./steps";
import type { UnloadedCommand } from "./types";

export const createTaskExecuteCommand = (db: Database): TaskExecuteCommand => {
  const eventStore = createEventStore(db);

  return (params) => {
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
