import {
  createSubscriptionRepository,
  createTaskRepository,
  createWorkspaceRepository,
} from "@/repos";
import { createNotificationService } from "@/services/notificationService";
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
  const notificationService = createNotificationService(
    ctx.get("workspace"),
    taskRepository,
    workspaceRepository,
  );

  const startTaskWorkflow = createStartTask(
    taskRepository,
    subscriptionRepository,
    notificationService,
    ctx.get("user"),
    ctx.get("workspace"),
  );

  return startTaskWorkflow;
};

export const constructUpdateTaskWorkflow = (ctx: Context) => {
  const taskRepository = createTaskRepository(ctx.get("db"));
  const workspaceRepository = createWorkspaceRepository(ctx.get("db"));
  const notificationService = createNotificationService(
    ctx.get("workspace"),
    taskRepository,
    workspaceRepository,
  );

  const updateTaskWorkflow = createUpdateTask(
    taskRepository,
    notificationService,
    ctx.get("user"),
    ctx.get("workspace"),
  );

  return updateTaskWorkflow;
};

export const constructReportBlockedWorkflow = (ctx: Context) => {
  const taskRepository = createTaskRepository(ctx.get("db"));
  const workspaceRepository = createWorkspaceRepository(ctx.get("db"));
  const notificationService = createNotificationService(
    ctx.get("workspace"),
    taskRepository,
    workspaceRepository,
  );

  const reportBlockedWorkflow = createReportBlocked(
    taskRepository,
    notificationService,
    ctx.get("user"),
    ctx.get("workspace"),
  );

  return reportBlockedWorkflow;
};

export const constructResolveBlockedWorkflow = (ctx: Context) => {
  const taskRepository = createTaskRepository(ctx.get("db"));
  const workspaceRepository = createWorkspaceRepository(ctx.get("db"));
  const notificationService = createNotificationService(
    ctx.get("workspace"),
    taskRepository,
    workspaceRepository,
  );

  const resolveBlockedWorkflow = createResolveBlocked(
    taskRepository,
    notificationService,
    ctx.get("user"),
    ctx.get("workspace"),
  );

  return resolveBlockedWorkflow;
};

export const constructPauseTaskWorkflow = (ctx: Context) => {
  const taskRepository = createTaskRepository(ctx.get("db"));
  const workspaceRepository = createWorkspaceRepository(ctx.get("db"));
  const notificationService = createNotificationService(
    ctx.get("workspace"),
    taskRepository,
    workspaceRepository,
  );

  const pauseTaskWorkflow = createPauseTask(
    taskRepository,
    notificationService,
    ctx.get("user"),
    ctx.get("workspace"),
  );

  return pauseTaskWorkflow;
};

export const constructResumeTaskWorkflow = (ctx: Context) => {
  const taskRepository = createTaskRepository(ctx.get("db"));
  const workspaceRepository = createWorkspaceRepository(ctx.get("db"));
  const notificationService = createNotificationService(
    ctx.get("workspace"),
    taskRepository,
    workspaceRepository,
  );

  const resumeTaskWorkflow = createResumeTask(
    taskRepository,
    notificationService,
    ctx.get("user"),
    ctx.get("workspace"),
  );

  return resumeTaskWorkflow;
};

export const constructListTasksWorkflow = (ctx: Context) => {
  const taskRepository = createTaskRepository(ctx.get("db"));

  const listTasksWorkflow = createListTasks(
    taskRepository,
    ctx.get("user"),
    ctx.get("workspace"),
  );

  return listTasksWorkflow;
};

export const constructCompleteTaskWorkflow = (ctx: Context) => {
  const taskRepository = createTaskRepository(ctx.get("db"));
  const workspaceRepository = createWorkspaceRepository(ctx.get("db"));
  const notificationService = createNotificationService(
    ctx.get("workspace"),
    taskRepository,
    workspaceRepository,
  );

  const completeTaskWorkflow = createCompleteTask(
    taskRepository,
    notificationService,
    ctx.get("user"),
    ctx.get("workspace"),
  );

  return completeTaskWorkflow;
};
