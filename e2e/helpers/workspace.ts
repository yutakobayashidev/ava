import type { Database } from "@/clients/drizzle";
import type { CreateWorkspaceInput } from "@/repos";
import { createWorkspaceRepository } from "@/repos";
import type { NonNullableUser } from "../dummyUsers";

export async function setupWorkspaceForUser(
  db: Database,
  user: NonNullableUser,
  workspaceInput: CreateWorkspaceInput,
) {
  const workspaceRepository = createWorkspaceRepository({ db });

  const workspace = await workspaceRepository.createWorkspace(workspaceInput);

  await workspaceRepository.setUserWorkspace(user.id, workspace.id);

  return workspace;
}
