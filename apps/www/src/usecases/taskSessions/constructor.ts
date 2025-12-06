import {
  createSubscriptionRepository,
  createTaskRepository,
  createWorkspaceRepository,
} from "@/repos";
import { createSlackNotificationService } from "@/services/slackNotificationService";
import { Context } from "@/types";
import { createCompleteTask } from "./complete";
import { createListTasks } from "./list";
import { createPauseTask } from "./pause";
import { createReportBlocked } from "./reportBlocked";
import { createResolveBlocked } from "./resolveBlocked";
import { createResumeTask } from "./resume";
import { createStartTask } from "./start";
import { createUpdateTask } from "./update";

export const constructStartTaskWorkflow = (ctx: Context) => {
  const taskRepository = createTaskRepository(ctx.get("db"));
  const subscriptionRepository = createSubscriptionRepository(ctx.get("db"));
  const workspaceRepository = createWorkspaceRepository(ctx.get("db"));
  const slackNotificationService =
    createSlackNotificationService(workspaceRepository);

  const startTaskWorkflow = createStartTask(
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

  const updateTaskWorkflow = createUpdateTask(
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

  const reportBlockedWorkflow = createReportBlocked(
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

  const resolveBlockedWorkflow = createResolveBlocked(
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

  const pauseTaskWorkflow = createPauseTask(
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

  const resumeTaskWorkflow = createResumeTask(
    taskRepository,
    slackNotificationService,
  );

  return resumeTaskWorkflow;
};

export const constructListTasksWorkflow = (ctx: Context) => {
  const taskRepository = createTaskRepository(ctx.get("db"));

  const listTasksWorkflow = createListTasks(taskRepository);

  return listTasksWorkflow;
};

export const constructCompleteTaskWorkflow = (ctx: Context) => {
  const taskRepository = createTaskRepository(ctx.get("db"));
  const workspaceRepository = createWorkspaceRepository(ctx.get("db"));
  const slackNotificationService =
    createSlackNotificationService(workspaceRepository);

  const completeTaskWorkflow = createCompleteTask(
    taskRepository,
    slackNotificationService,
  );

  return completeTaskWorkflow;
};
