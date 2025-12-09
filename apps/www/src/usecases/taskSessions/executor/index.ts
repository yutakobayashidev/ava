import { createEventStore } from "@/repos/event-store";
import type { Database } from "@ava/database/client";
import { ok } from "neverthrow";
import type { TaskExecuteWorkflow } from "../interface";
import { commitEvents, decideEvents, loadEvents, projectEvents } from "./steps";

export const createTaskExecuteCommand = (db: Database): TaskExecuteWorkflow => {
  const eventStore = createEventStore(db);

  return (command) => {
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
