import { HonoEnv } from "@/types";
import { describe, expect, it, vi } from "vitest";
import { handleApplicationCommands } from "./handleSlackCommands";

describe("handleApplicationCommands", () => {
  const mockCtx = {} as HonoEnv["Variables"];

  it("should call matching command handler", async () => {
    const mockHandler = vi.fn().mockResolvedValue({
      response_type: "ephemeral",
      text: "Success",
    });

    const commands = [
      {
        commandName: "/test-command",
        handler: mockHandler,
      },
    ];

    const result = await handleApplicationCommands({
      command: "/test-command",
      teamId: "T123",
      userId: "U123",
      commands,
      ctx: mockCtx,
    });

    expect(mockHandler).toHaveBeenCalledWith({
      teamId: "T123",
      userId: "U123",
      ctx: mockCtx,
    });
    expect(result).toEqual({
      response_type: "ephemeral",
      text: "Success",
    });
  });

  it("should return error message for unsupported command", async () => {
    const mockHandler = vi.fn();

    const commands = [
      {
        commandName: "/test-command",
        handler: mockHandler,
      },
    ];

    const result = await handleApplicationCommands({
      command: "/unknown-command",
      teamId: "T123",
      userId: "U123",
      commands,
      ctx: mockCtx,
    });

    expect(mockHandler).not.toHaveBeenCalled();
    expect(result).toEqual({
      response_type: "ephemeral",
      text: "未対応のコマンドです",
    });
  });

  it("should handle multiple commands and call the correct one", async () => {
    const mockHandler1 = vi.fn().mockResolvedValue({
      response_type: "ephemeral",
      text: "Command 1",
    });
    const mockHandler2 = vi.fn().mockResolvedValue({
      response_type: "ephemeral",
      text: "Command 2",
    });

    const commands = [
      {
        commandName: "/command-1",
        handler: mockHandler1,
      },
      {
        commandName: "/command-2",
        handler: mockHandler2,
      },
    ];

    const result = await handleApplicationCommands({
      command: "/command-2",
      teamId: "T123",
      userId: "U123",
      commands,
      ctx: mockCtx,
    });

    expect(mockHandler1).not.toHaveBeenCalled();
    expect(mockHandler2).toHaveBeenCalledWith({
      teamId: "T123",
      userId: "U123",
      ctx: mockCtx,
    });
    expect(result).toEqual({
      response_type: "ephemeral",
      text: "Command 2",
    });
  });

  it("should handle empty commands array", async () => {
    const result = await handleApplicationCommands({
      command: "/any-command",
      teamId: "T123",
      userId: "U123",
      commands: [],
      ctx: mockCtx,
    });

    expect(result).toEqual({
      response_type: "ephemeral",
      text: "未対応のコマンドです",
    });
  });
});
