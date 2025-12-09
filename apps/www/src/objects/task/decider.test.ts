import { describe, expect, it } from "vitest";
import { apply, decide, replay } from "./decider";
import { initialState } from "./types";

describe("Task decider", () => {
  it("starts -> update -> complete", () => {
    const now = new Date();
    const streamId = "task-1";
    const startedResult = decide(
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
    expect.assert(startedResult.isOk());
    const started = startedResult.value;
    const stateAfterStart = replay(streamId, started);

    const updatedResult = decide(
      stateAfterStart,
      { type: "AddProgress", payload: { summary: "progress" } },
      now,
    );
    expect.assert(updatedResult.isOk());
    const updated = updatedResult.value;

    const completedResult = decide(
      replay(streamId, [...started, ...updated]),
      { type: "CompleteTask", payload: { summary: "done" } },
      now,
    );
    expect.assert(completedResult.isOk());
    const completed = completedResult.value;

    const stateAfterUpdate = replay(streamId, [...started, ...updated]);
    const finalState = apply(stateAfterUpdate, completed);
    expect(finalState.status).toBe("completed");
    expect(finalState.initialSummary).toBe("init");
  });

  it("blocks then resolves", () => {
    const now = new Date();
    const streamId = "task-2";
    const startedResult = decide(
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
    expect.assert(startedResult.isOk());
    const started = startedResult.value;

    const blockedResult = decide(
      replay(streamId, started),
      { type: "ReportBlock", payload: { reason: "oops" } },
      now,
    );
    expect.assert(blockedResult.isOk());
    const blocked = blockedResult.value;
    const blockEvent = blocked[0];
    if (!blockEvent || blockEvent.type !== "TaskBlocked") {
      throw new Error("TaskBlocked event not emitted");
    }
    const blockId = blockEvent.payload.blockId;

    const resolvedResult = decide(
      apply(replay(streamId, started), blocked),
      {
        type: "ResolveBlock",
        payload: { blockId },
      },
      now,
    );
    expect.assert(resolvedResult.isOk());
    const resolved = resolvedResult.value;

    const state = replay(streamId, [...started, ...blocked, ...resolved]);
    expect(state.status).toBe("in_progress");
    expect(state.unresolvedBlocks.length).toBe(0);
  });

  it("prevents updates after completion", () => {
    const now = new Date();
    const streamId = "task-3";
    const startedResult = decide(
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
    expect.assert(startedResult.isOk());
    const started = startedResult.value;

    const completedResult = decide(
      replay(streamId, started),
      { type: "CompleteTask", payload: { summary: "done" } },
      now,
    );
    expect.assert(completedResult.isOk());
    const completed = completedResult.value;

    const finalState = replay(streamId, [...started, ...completed]);
    const result = decide(
      finalState,
      { type: "AddProgress", payload: { summary: "more" } },
      now,
    );
    expect.assert(result.isErr());
    expect(result.error.message).toMatch(/Invalid status transition/);
  });

  it("applies new events incrementally", () => {
    const now = new Date();
    const streamId = "task-apply";
    const startedResult = decide(
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
    expect.assert(startedResult.isOk());
    const started = startedResult.value;
    const stateAfterStart = replay(streamId, started);

    const blockedResult = decide(
      stateAfterStart,
      { type: "ReportBlock", payload: { reason: "blocked" } },
      now,
    );
    expect.assert(blockedResult.isOk());
    const blocked = blockedResult.value;
    const blockEvent = blocked[0];
    if (!blockEvent || blockEvent.type !== "TaskBlocked") {
      throw new Error("TaskBlocked event not emitted");
    }
    const blockId = blockEvent.payload.blockId;

    const resolvedResult = decide(
      apply(stateAfterStart, blocked),
      { type: "ResolveBlock", payload: { blockId } },
      now,
    );
    expect.assert(resolvedResult.isOk());
    const resolved = resolvedResult.value;

    const incremental = apply(stateAfterStart, [...blocked, ...resolved]);
    const replayed = replay(streamId, [...started, ...blocked, ...resolved]);

    expect(incremental).toEqual(replayed);
  });
});
