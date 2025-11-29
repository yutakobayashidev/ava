import type {
  WorkspaceRepository,
  TaskRepository,
  UserRepository,
} from "@/repos";
import type { Env } from "@/app/create-app";

type Repositories = {
  workspaceRepository: WorkspaceRepository;
  taskRepository: TaskRepository;
  userRepository: UserRepository;
};

type SlackCommandHandler = {
  commandName: string;
  handler: (args: {
    teamId: string;
    userId: string;
    repositories: Repositories;
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
  repositories,
  commands,
  ctx,
}: {
  command: string;
  teamId: string;
  userId: string;
  repositories: Repositories;
  commands: SlackCommandHandler[];
  ctx: Env["Variables"];
}) => {
  for (const cmd of commands) {
    if (cmd.commandName === command) {
      return cmd.handler({
        teamId,
        userId,
        repositories,
        ctx,
      });
    }
  }

  return {
    response_type: "ephemeral" as const,
    text: "未対応のコマンドです",
  };
};
