import type { replay } from "@/objects/task/decider";
import type { Command, Event } from "@/objects/task/types";
import type { HonoEnv } from "@/types";
import type * as schema from "@ava/database/schema";

/**
 * Command Executor: Pipeline Types
 *
 * パイプラインの各ステージで使用される型定義
 */

export type UnloadedCommand = {
  kind: "unloaded";
  streamId: string;
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  command: Command;
};

export type LoadedCommand = {
  kind: "loaded";
  streamId: string;
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  command: Command;
  history: Event[];
  state: ReturnType<typeof replay>;
};

export type DecidedCommand = {
  kind: "decided";
  streamId: string;
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  state: ReturnType<typeof replay>;
  newEvents: Event[];
  expectedVersion: number;
};

export type CommittedCommand = {
  kind: "committed";
  streamId: string;
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  state: ReturnType<typeof replay>;
  newEvents: Event[];
  persistedEvents: schema.TaskEvent[];
  version: number;
};

export type ProjectedCommand = {
  kind: "projected";
  events: Event[];
  persistedEvents: schema.TaskEvent[];
  state: ReturnType<typeof replay>;
  version: number;
};
