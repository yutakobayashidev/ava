import { describe, expect, it } from "vitest";
import { decide, replay } from "./decider";
import { initialState } from "./types";

describe("Task decider", () => {
  it("starts -> update -> complete", () => {
    const now = new Date();
    const streamId = "task-1";
    const started = decide(
      { ...initialState, streamId },
      {
        type: "StartTask",
        payload: {
          issue: { provider: "manual", title: "Test" },
          initialSummary: "init",
        },
      },
      now,
    );
    const stateAfterStart = replay(streamId, started);

    const updated = decide(
      stateAfterStart,
      { type: "AddProgress", payload: { summary: "progress" } },
      now,
    );

    const completed = decide(
      replay(streamId, [...started, ...updated]),
      { type: "CompleteTask", payload: { summary: "done" } },
      now,
    );

    const finalState = replay(streamId, [...started, ...updated, ...completed]);
    expect(finalState.status).toBe("completed");
    expect(finalState.initialSummary).toBe("init");
  });

  it("blocks then resolves", () => {
    const now = new Date();
    const streamId = "task-2";
    const started = decide(
      { ...initialState, streamId },
      {
        type: "StartTask",
        payload: {
          issue: { provider: "manual", title: "Test" },
          initialSummary: "init",
        },
      },
      now,
    );
    const blocked = decide(
      replay(streamId, started),
      { type: "ReportBlock", payload: { reason: "oops" } },
      now,
    );
    const blockEvent = blocked[0];
    if (!blockEvent || blockEvent.type !== "TaskBlocked") {
      throw new Error("TaskBlocked event not emitted");
    }
    const blockId = blockEvent.payload.blockId;

    const resolved = decide(
      replay(streamId, [...started, ...blocked]),
      { type: "ResolveBlock", payload: { blockId } },
      now,
    );

    const state = replay(streamId, [...started, ...blocked, ...resolved]);
    expect(state.status).toBe("in_progress");
    expect(state.unresolvedBlocks.length).toBe(0);
  });

  it("prevents updates after completion", () => {
    const now = new Date();
    const streamId = "task-3";
    const started = decide(
      { ...initialState, streamId },
      {
        type: "StartTask",
        payload: {
          issue: { provider: "manual", title: "Test" },
          initialSummary: "init",
        },
      },
      now,
    );
    const completed = decide(
      replay(streamId, started),
      { type: "CompleteTask", payload: { summary: "done" } },
      now,
    );
    const finalState = replay(streamId, [...started, ...completed]);
    expect(() =>
      decide(
        finalState,
        { type: "AddProgress", payload: { summary: "more" } },
        now,
      ),
    ).toThrowError(/Invalid status transition/);
  });
});
