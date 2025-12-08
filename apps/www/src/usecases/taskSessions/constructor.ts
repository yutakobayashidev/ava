import {
  createSubscriptionRepository,
  createTaskQueryRepository,
} from "@/repos";
import { createTaskCommandExecutor } from "./commandExecutor";
import { Context } from "@/types";
import { createCancelTask } from "./cancel";
import { createCompleteTask } from "./complete";
import { createListTasks } from "./list";
import { createPauseTask } from "./pause";
import { createReportBlocked } from "./reportBlocked";
import { createResolveBlocked } from "./resolveBlocked";
import { createResumeTask } from "./resume";
import { createStartTask } from "./start";
import { createUpdateTask } from "./update";

export const constructStartTaskWorkflow = (ctx: Context) => {
  const subscriptionRepository = createSubscriptionRepository(ctx.get("db"));
  const commandExecutor = createTaskCommandExecutor({ db: ctx.get("db") });

  const startTaskWorkflow = createStartTask(
    subscriptionRepository,
    commandExecutor,
  );

  return startTaskWorkflow;
};

export const constructUpdateTaskWorkflow = (ctx: Context) => {
  const commandExecutor = createTaskCommandExecutor({ db: ctx.get("db") });

  const updateTaskWorkflow = createUpdateTask(commandExecutor);

  return updateTaskWorkflow;
};

export const constructReportBlockedWorkflow = (ctx: Context) => {
  const commandExecutor = createTaskCommandExecutor({ db: ctx.get("db") });

  const reportBlockedWorkflow = createReportBlocked(commandExecutor);

  return reportBlockedWorkflow;
};

export const constructResolveBlockedWorkflow = (ctx: Context) => {
  const commandExecutor = createTaskCommandExecutor({ db: ctx.get("db") });

  const resolveBlockedWorkflow = createResolveBlocked(commandExecutor);

  return resolveBlockedWorkflow;
};

export const constructPauseTaskWorkflow = (ctx: Context) => {
  const commandExecutor = createTaskCommandExecutor({ db: ctx.get("db") });

  const pauseTaskWorkflow = createPauseTask(commandExecutor);

  return pauseTaskWorkflow;
};

export const constructResumeTaskWorkflow = (ctx: Context) => {
  const commandExecutor = createTaskCommandExecutor({ db: ctx.get("db") });

  const resumeTaskWorkflow = createResumeTask(commandExecutor);

  return resumeTaskWorkflow;
};

export const constructListTasksWorkflow = (ctx: Context) => {
  const taskRepository = createTaskQueryRepository(ctx.get("db"));

  const listTasksWorkflow = createListTasks(taskRepository);

  return listTasksWorkflow;
};

export const constructCompleteTaskWorkflow = (ctx: Context) => {
  const taskRepository = createTaskQueryRepository(ctx.get("db"));
  const commandExecutor = createTaskCommandExecutor({ db: ctx.get("db") });

  const completeTaskWorkflow = createCompleteTask(
    taskRepository,
    commandExecutor,
  );

  return completeTaskWorkflow;
};

export const constructCancelTaskWorkflow = (ctx: Context) => {
  const commandExecutor = createTaskCommandExecutor({ db: ctx.get("db") });

  const cancelTaskWorkflow = createCancelTask(commandExecutor);

  return cancelTaskWorkflow;
};
