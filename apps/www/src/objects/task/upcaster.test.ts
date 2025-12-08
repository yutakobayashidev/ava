import { describe, expect, it } from "vitest";
import { upcastEvent } from "./upcaster";
import type { Event } from "./types";

describe("upcastEvent", () => {
  describe("TaskStarted", () => {
    it("returns V1 event unchanged", () => {
      const event: Event = {
        type: "TaskStarted",
        schemaVersion: 1,
        payload: {
          issue: { provider: "manual", title: "Test task" },
          initialSummary: "Starting test",
          occurredAt: new Date("2025-01-01T00:00:00Z"),
        },
      };

      const result = upcastEvent(event);

      expect(result).toEqual(event);
    });
  });

  describe("TaskUpdated", () => {
    it("returns V1 event unchanged", () => {
      const event: Event = {
        type: "TaskUpdated",
        schemaVersion: 1,
        payload: {
          summary: "Progress update",
          occurredAt: new Date("2025-01-01T00:00:00Z"),
        },
      };

      const result = upcastEvent(event);

      expect(result).toEqual(event);
    });
  });

  describe("TaskBlocked", () => {
    it("returns V1 event unchanged", () => {
      const event: Event = {
        type: "TaskBlocked",
        schemaVersion: 1,
        payload: {
          blockId: "block-123",
          reason: "Waiting for review",
          occurredAt: new Date("2025-01-01T00:00:00Z"),
        },
      };

      const result = upcastEvent(event);

      expect(result).toEqual(event);
    });
  });

  describe("BlockResolved", () => {
    it("returns V1 event unchanged", () => {
      const event: Event = {
        type: "BlockResolved",
        schemaVersion: 1,
        payload: {
          blockId: "block-123",
          reason: "Review completed",
          occurredAt: new Date("2025-01-01T00:00:00Z"),
        },
      };

      const result = upcastEvent(event);

      expect(result).toEqual(event);
    });
  });

  describe("TaskPaused", () => {
    it("returns V1 event unchanged", () => {
      const event: Event = {
        type: "TaskPaused",
        schemaVersion: 1,
        payload: {
          pauseId: "pause-123",
          reason: "Taking a break",
          occurredAt: new Date("2025-01-01T00:00:00Z"),
        },
      };

      const result = upcastEvent(event);

      expect(result).toEqual(event);
    });
  });

  describe("TaskResumed", () => {
    it("returns V1 event unchanged", () => {
      const event: Event = {
        type: "TaskResumed",
        schemaVersion: 1,
        payload: {
          summary: "Resuming work",
          resumedFromPauseId: "pause-123",
          occurredAt: new Date("2025-01-01T00:00:00Z"),
        },
      };

      const result = upcastEvent(event);

      expect(result).toEqual(event);
    });
  });

  describe("TaskCompleted", () => {
    it("returns V1 event unchanged", () => {
      const event: Event = {
        type: "TaskCompleted",
        schemaVersion: 1,
        payload: {
          summary: "Task finished",
          occurredAt: new Date("2025-01-01T00:00:00Z"),
        },
      };

      const result = upcastEvent(event);

      expect(result).toEqual(event);
    });
  });

  describe("TaskCancelled", () => {
    it("returns V1 event unchanged", () => {
      const event: Event = {
        type: "TaskCancelled",
        schemaVersion: 1,
        payload: {
          reason: "No longer needed",
          occurredAt: new Date("2025-01-01T00:00:00Z"),
        },
      };

      const result = upcastEvent(event);

      expect(result).toEqual(event);
    });

    it("returns V1 event unchanged when reason is undefined", () => {
      const event: Event = {
        type: "TaskCancelled",
        schemaVersion: 1,
        payload: {
          occurredAt: new Date("2025-01-01T00:00:00Z"),
        },
      };

      const result = upcastEvent(event);

      expect(result).toEqual(event);
    });
  });

  describe("SlackThreadLinked", () => {
    it("returns V1 event unchanged", () => {
      const event: Event = {
        type: "SlackThreadLinked",
        schemaVersion: 1,
        payload: {
          channel: "C123456",
          threadTs: "1234567890.123456",
          occurredAt: new Date("2025-01-01T00:00:00Z"),
        },
      };

      const result = upcastEvent(event);

      expect(result).toEqual(event);
    });
  });

  describe("unknown event types", () => {
    it("throws error for unknown event type", () => {
      const unknownEvent = {
        type: "UnknownEventType",
        schemaVersion: 1,
        payload: {},
      } as unknown as Event;

      expect(() => upcastEvent(unknownEvent)).toThrow(
        /Unknown event type for upcasting/,
      );
    });
  });
});
