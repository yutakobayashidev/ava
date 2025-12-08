import type { Event } from "./types";

/**
 * Upcast infrastructure for event schema evolution
 *
 * When schema changes are needed:
 * 1. Add new version to Event union type in types.ts
 * 2. Implement upcast function to convert old version to new
 * 3. Chain upcasts if multiple versions exist (V1 → V2 → V3)
 */

// Type helper to extract events by type
type ExtractEvent<T extends Event["type"]> = Extract<Event, { type: T }>;

/**
 * Upcasts TaskStarted event to latest schema version
 */
function upcastTaskStarted(
  event: ExtractEvent<"TaskStarted">,
): ExtractEvent<"TaskStarted"> {
  // Currently only V1 exists, so no conversion needed
  if (event.schemaVersion === 1) {
    return event;
  }

  // Future example:
  // if (event.schemaVersion === 1) {
  //   return {
  //     ...event,
  //     schemaVersion: 2,
  //     payload: {
  //       ...event.payload,
  //       newField: "defaultValue"
  //     }
  //   };
  // }

  return event;
}

/**
 * Upcasts TaskUpdated event to latest schema version
 */
function upcastTaskUpdated(
  event: ExtractEvent<"TaskUpdated">,
): ExtractEvent<"TaskUpdated"> {
  if (event.schemaVersion === 1) {
    return event;
  }
  return event;
}

/**
 * Upcasts TaskBlocked event to latest schema version
 */
function upcastTaskBlocked(
  event: ExtractEvent<"TaskBlocked">,
): ExtractEvent<"TaskBlocked"> {
  if (event.schemaVersion === 1) {
    return event;
  }
  return event;
}

/**
 * Upcasts BlockResolved event to latest schema version
 */
function upcastBlockResolved(
  event: ExtractEvent<"BlockResolved">,
): ExtractEvent<"BlockResolved"> {
  if (event.schemaVersion === 1) {
    return event;
  }
  return event;
}

/**
 * Upcasts TaskPaused event to latest schema version
 */
function upcastTaskPaused(
  event: ExtractEvent<"TaskPaused">,
): ExtractEvent<"TaskPaused"> {
  if (event.schemaVersion === 1) {
    return event;
  }
  return event;
}

/**
 * Upcasts TaskResumed event to latest schema version
 */
function upcastTaskResumed(
  event: ExtractEvent<"TaskResumed">,
): ExtractEvent<"TaskResumed"> {
  if (event.schemaVersion === 1) {
    return event;
  }
  return event;
}

/**
 * Upcasts TaskCompleted event to latest schema version
 */
function upcastTaskCompleted(
  event: ExtractEvent<"TaskCompleted">,
): ExtractEvent<"TaskCompleted"> {
  if (event.schemaVersion === 1) {
    return event;
  }
  return event;
}

/**
 * Upcasts TaskCancelled event to latest schema version
 */
function upcastTaskCancelled(
  event: ExtractEvent<"TaskCancelled">,
): ExtractEvent<"TaskCancelled"> {
  if (event.schemaVersion === 1) {
    return event;
  }
  return event;
}

/**
 * Upcasts SlackThreadLinked event to latest schema version
 */
function upcastSlackThreadLinked(
  event: ExtractEvent<"SlackThreadLinked">,
): ExtractEvent<"SlackThreadLinked"> {
  if (event.schemaVersion === 1) {
    return event;
  }
  return event;
}

/**
 * Main upcast function that delegates to specific event upcasters
 * This is called when loading events from the event store
 */
export function upcastEvent(event: Event): Event {
  switch (event.type) {
    case "TaskStarted":
      return upcastTaskStarted(event);
    case "TaskUpdated":
      return upcastTaskUpdated(event);
    case "TaskBlocked":
      return upcastTaskBlocked(event);
    case "BlockResolved":
      return upcastBlockResolved(event);
    case "TaskPaused":
      return upcastTaskPaused(event);
    case "TaskResumed":
      return upcastTaskResumed(event);
    case "TaskCompleted":
      return upcastTaskCompleted(event);
    case "TaskCancelled":
      return upcastTaskCancelled(event);
    case "SlackThreadLinked":
      return upcastSlackThreadLinked(event);
    default: {
      const _exhaustive: never = event;
      throw new Error(
        `Unknown event type for upcasting: ${(_exhaustive as Event).type}`,
      );
    }
  }
}
