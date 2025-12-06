import type { Env } from "@/app/create-app";

type SlackCommandHandler = {
  commandName: string;
  handler: (args: {
    teamId: string;
    userId: string;
    ctx: Env["Variables"];
  }) => Promise<{
    response_type: "ephemeral" | "in_channel";
    text: string;
  }>;
};

export const handleApplicationCommands = async ({
  command,
  teamId,
  userId,
  commands,
  ctx,
}: {
  command: string;
  teamId: string;
  userId: string;
  commands: SlackCommandHandler[];
  ctx: Env["Variables"];
}) => {
  for (const cmd of commands) {
    if (cmd.commandName === command) {
      return cmd.handler({
        teamId,
        userId,
        ctx,
      });
    }
  }

  return {
    response_type: "ephemeral" as const,
    text: "未対応のコマンドです",
  };
};
