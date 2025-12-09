import {
  createSubscriptionRepository,
  createTaskQueryRepository,
} from "@/repos";
import { Context } from "@/types";
import { createTaskExecuteCommand } from "./executor/index";
import {
  createCancelTaskWorkflow,
  createCompleteTaskWorkflow,
  createListTasksWorkflow,
  createPauseTaskWorkflow,
  createReportBlockedWorkflow,
  createResolveBlockedWorkflow,
  createResumeTaskWorkflow,
  createStartTaskWorkflow,
  createUpdateTaskWorkflow,
} from "./index";

export const constructStartTaskWorkflow = (ctx: Context) => {
  const subscriptionRepository = createSubscriptionRepository(ctx.get("db"));
  const commandExecutor = createTaskExecuteCommand(ctx.get("db"));

  const startTaskWorkflow = createStartTaskWorkflow(
    subscriptionRepository,
    commandExecutor,
  );

  return startTaskWorkflow;
};

export const constructUpdateTaskWorkflow = (ctx: Context) => {
  const commandExecutor = createTaskExecuteCommand(ctx.get("db"));

  const updateTaskWorkflow = createUpdateTaskWorkflow(commandExecutor);

  return updateTaskWorkflow;
};

export const constructReportBlockedWorkflow = (ctx: Context) => {
  const commandExecutor = createTaskExecuteCommand(ctx.get("db"));

  const reportBlockedWorkflow = createReportBlockedWorkflow(commandExecutor);

  return reportBlockedWorkflow;
};

export const constructResolveBlockedWorkflow = (ctx: Context) => {
  const commandExecutor = createTaskExecuteCommand(ctx.get("db"));

  const resolveBlockedWorkflow = createResolveBlockedWorkflow(commandExecutor);

  return resolveBlockedWorkflow;
};

export const constructPauseTaskWorkflow = (ctx: Context) => {
  const commandExecutor = createTaskExecuteCommand(ctx.get("db"));

  const pauseTaskWorkflow = createPauseTaskWorkflow(commandExecutor);

  return pauseTaskWorkflow;
};

export const constructResumeTaskWorkflow = (ctx: Context) => {
  const commandExecutor = createTaskExecuteCommand(ctx.get("db"));

  const resumeTaskWorkflow = createResumeTaskWorkflow(commandExecutor);

  return resumeTaskWorkflow;
};

export const constructListTasksWorkflow = (ctx: Context) => {
  const taskRepository = createTaskQueryRepository(ctx.get("db"));

  const listTasksWorkflow = createListTasksWorkflow(taskRepository);

  return listTasksWorkflow;
};

export const constructCompleteTaskWorkflow = (ctx: Context) => {
  const taskRepository = createTaskQueryRepository(ctx.get("db"));
  const commandExecutor = createTaskExecuteCommand(ctx.get("db"));

  const completeTaskWorkflow = createCompleteTaskWorkflow(
    taskRepository,
    commandExecutor,
  );

  return completeTaskWorkflow;
};

export const constructCancelTaskWorkflow = (ctx: Context) => {
  const commandExecutor = createTaskExecuteCommand(ctx.get("db"));

  const cancelTaskWorkflow = createCancelTaskWorkflow(commandExecutor);

  return cancelTaskWorkflow;
};
