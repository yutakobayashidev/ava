import {
  createSubscriptionRepository,
  createTaskRepository,
  createWorkspaceRepository,
} from "@/repos";
import { createSlackNotificationService } from "@/services/slackNotificationService";
import { Context } from "@/types";
import { createCompleteTaskSessionWorkflow } from "./complete";
import { createListTaskSessionsWorkflow } from "./list";
import { createPauseTaskWorkflow } from "./pause";
import { createReportBlockedWorkflow } from "./reportBlocked";
import { createResolveBlockedWorkflow } from "./resolveBlocked";
import { createResumeTaskWorkflow } from "./resume";
import { createStartTaskWorkflow } from "./start";
import { createUpdateTaskSessionWorkflow } from "./update";

export const constructStartTaskWorkflow = (ctx: Context) => {
  const taskRepository = createTaskRepository(ctx.get("db"));
  const subscriptionRepository = createSubscriptionRepository(ctx.get("db"));
  const workspaceRepository = createWorkspaceRepository(ctx.get("db"));
  const slackNotificationService =
    createSlackNotificationService(workspaceRepository);

  const startTaskWorkflow = createStartTaskWorkflow(
    taskRepository,
    subscriptionRepository,
    slackNotificationService,
  );

  return startTaskWorkflow;
};

export const constructUpdateTaskWorkflow = (ctx: Context) => {
  const taskRepository = createTaskRepository(ctx.get("db"));
  const workspaceRepository = createWorkspaceRepository(ctx.get("db"));
  const slackNotificationService =
    createSlackNotificationService(workspaceRepository);

  const updateTaskWorkflow = createUpdateTaskSessionWorkflow(
    taskRepository,
    slackNotificationService,
  );

  return updateTaskWorkflow;
};

export const constructReportBlockedWorkflow = (ctx: Context) => {
  const taskRepository = createTaskRepository(ctx.get("db"));
  const workspaceRepository = createWorkspaceRepository(ctx.get("db"));
  const slackNotificationService =
    createSlackNotificationService(workspaceRepository);

  const reportBlockedWorkflow = createReportBlockedWorkflow(
    taskRepository,
    slackNotificationService,
  );

  return reportBlockedWorkflow;
};

export const constructResolveBlockedWorkflow = (ctx: Context) => {
  const taskRepository = createTaskRepository(ctx.get("db"));
  const workspaceRepository = createWorkspaceRepository(ctx.get("db"));
  const slackNotificationService =
    createSlackNotificationService(workspaceRepository);

  const resolveBlockedWorkflow = createResolveBlockedWorkflow(
    taskRepository,
    slackNotificationService,
  );

  return resolveBlockedWorkflow;
};

export const constructPauseTaskWorkflow = (ctx: Context) => {
  const taskRepository = createTaskRepository(ctx.get("db"));
  const workspaceRepository = createWorkspaceRepository(ctx.get("db"));
  const slackNotificationService =
    createSlackNotificationService(workspaceRepository);

  const pauseTaskWorkflow = createPauseTaskWorkflow(
    taskRepository,
    slackNotificationService,
  );

  return pauseTaskWorkflow;
};

export const constructResumeTaskWorkflow = (ctx: Context) => {
  const taskRepository = createTaskRepository(ctx.get("db"));
  const workspaceRepository = createWorkspaceRepository(ctx.get("db"));
  const slackNotificationService =
    createSlackNotificationService(workspaceRepository);

  const resumeTaskWorkflow = createResumeTaskWorkflow(
    taskRepository,
    slackNotificationService,
  );

  return resumeTaskWorkflow;
};

export const constructListTasksWorkflow = (ctx: Context) => {
  const taskRepository = createTaskRepository(ctx.get("db"));

  const listTasksWorkflow = createListTaskSessionsWorkflow(taskRepository);

  return listTasksWorkflow;
};

export const constructCompleteTaskWorkflow = (ctx: Context) => {
  const taskRepository = createTaskRepository(ctx.get("db"));
  const workspaceRepository = createWorkspaceRepository(ctx.get("db"));
  const slackNotificationService =
    createSlackNotificationService(workspaceRepository);

  const completeTaskWorkflow = createCompleteTaskSessionWorkflow(
    taskRepository,
    slackNotificationService,
  );

  return completeTaskWorkflow;
};
