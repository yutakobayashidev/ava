import { describe, expect, it } from "vitest";
import {
  ALLOWED_TRANSITIONS,
  isTerminalStatus,
  isValidTransition,
  validateTransition,
  type TaskStatus,
} from "./task-status";

describe("task-status", () => {
  describe("ALLOWED_TRANSITIONS", () => {
    it("should define valid transitions for in_progress", () => {
      expect(ALLOWED_TRANSITIONS.in_progress).toEqual([
        "blocked",
        "paused",
        "completed",
        "cancelled",
      ]);
    });

    it("should define valid transitions for blocked", () => {
      expect(ALLOWED_TRANSITIONS.blocked).toEqual([
        "in_progress",
        "paused",
        "cancelled",
      ]);
    });

    it("should define valid transitions for paused", () => {
      expect(ALLOWED_TRANSITIONS.paused).toEqual(["in_progress", "cancelled"]);
    });

    it("should define no transitions for completed (terminal state)", () => {
      expect(ALLOWED_TRANSITIONS.completed).toEqual([]);
    });

    it("should define no transitions for cancelled (terminal state)", () => {
      expect(ALLOWED_TRANSITIONS.cancelled).toEqual([]);
    });
  });

  describe("isValidTransition", () => {
    it("should allow same state transition", () => {
      const statuses: TaskStatus[] = [
        "in_progress",
        "blocked",
        "paused",
        "completed",
        "cancelled",
      ];

      statuses.forEach((status) => {
        expect(isValidTransition(status, status)).toBe(true);
      });
    });

    it("should allow valid transitions from in_progress", () => {
      expect(isValidTransition("in_progress", "blocked")).toBe(true);
      expect(isValidTransition("in_progress", "paused")).toBe(true);
      expect(isValidTransition("in_progress", "completed")).toBe(true);
      expect(isValidTransition("in_progress", "cancelled")).toBe(true);
    });

    it("should allow valid transitions from blocked", () => {
      expect(isValidTransition("blocked", "in_progress")).toBe(true);
      expect(isValidTransition("blocked", "paused")).toBe(true);
      expect(isValidTransition("blocked", "cancelled")).toBe(true);
    });

    it("should allow valid transitions from paused", () => {
      expect(isValidTransition("paused", "in_progress")).toBe(true);
      expect(isValidTransition("paused", "cancelled")).toBe(true);
    });

    it("should reject invalid transitions from blocked", () => {
      expect(isValidTransition("blocked", "completed")).toBe(false);
    });

    it("should reject invalid transitions from paused", () => {
      expect(isValidTransition("paused", "blocked")).toBe(false);
      expect(isValidTransition("paused", "completed")).toBe(false);
    });

    it("should reject all transitions from completed (terminal state)", () => {
      expect(isValidTransition("completed", "in_progress")).toBe(false);
      expect(isValidTransition("completed", "blocked")).toBe(false);
      expect(isValidTransition("completed", "paused")).toBe(false);
      expect(isValidTransition("completed", "cancelled")).toBe(false);
    });

    it("should reject all transitions from cancelled (terminal state)", () => {
      expect(isValidTransition("cancelled", "in_progress")).toBe(false);
      expect(isValidTransition("cancelled", "blocked")).toBe(false);
      expect(isValidTransition("cancelled", "paused")).toBe(false);
      expect(isValidTransition("cancelled", "completed")).toBe(false);
    });
  });

  describe("validateTransition", () => {
    it("should not throw for valid transitions", () => {
      expect(() => validateTransition("in_progress", "blocked")).not.toThrow();
      expect(() => validateTransition("blocked", "in_progress")).not.toThrow();
      expect(() => validateTransition("paused", "in_progress")).not.toThrow();
    });

    it("should not throw for same state transition", () => {
      expect(() =>
        validateTransition("in_progress", "in_progress"),
      ).not.toThrow();
      expect(() => validateTransition("completed", "completed")).not.toThrow();
    });

    it("should throw descriptive error for invalid transitions", () => {
      expect(() => validateTransition("blocked", "completed")).toThrow(
        "Invalid status transition: blocked → completed. Allowed transitions from blocked: [in_progress, paused, cancelled]",
      );

      expect(() => validateTransition("paused", "blocked")).toThrow(
        "Invalid status transition: paused → blocked. Allowed transitions from paused: [in_progress, cancelled]",
      );

      expect(() => validateTransition("completed", "in_progress")).toThrow(
        "Invalid status transition: completed → in_progress. Allowed transitions from completed: []",
      );

      expect(() => validateTransition("cancelled", "in_progress")).toThrow(
        "Invalid status transition: cancelled → in_progress. Allowed transitions from cancelled: []",
      );
    });
  });

  describe("isTerminalStatus", () => {
    it("should return true for terminal states", () => {
      expect(isTerminalStatus("completed")).toBe(true);
      expect(isTerminalStatus("cancelled")).toBe(true);
    });

    it("should return false for non-terminal states", () => {
      expect(isTerminalStatus("in_progress")).toBe(false);
      expect(isTerminalStatus("blocked")).toBe(false);
      expect(isTerminalStatus("paused")).toBe(false);
    });
  });
});
