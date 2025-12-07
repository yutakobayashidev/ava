import { createSubscriptionRepository, createTaskRepository } from "@/repos";
import { createTaskCommandExecutor } from "./commandExecutor";
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
  const commandExecutor = createTaskCommandExecutor({ db: ctx.get("db") });

  const startTaskWorkflow = createStartTask(
    taskRepository,
    subscriptionRepository,
    commandExecutor,
  );

  return startTaskWorkflow;
};

export const constructUpdateTaskWorkflow = (ctx: Context) => {
  const taskRepository = createTaskRepository(ctx.get("db"));
  const commandExecutor = createTaskCommandExecutor({ db: ctx.get("db") });

  const updateTaskWorkflow = createUpdateTask(taskRepository, commandExecutor);

  return updateTaskWorkflow;
};

export const constructReportBlockedWorkflow = (ctx: Context) => {
  const taskRepository = createTaskRepository(ctx.get("db"));
  const commandExecutor = createTaskCommandExecutor({ db: ctx.get("db") });

  const reportBlockedWorkflow = createReportBlocked(
    taskRepository,
    commandExecutor,
  );

  return reportBlockedWorkflow;
};

export const constructResolveBlockedWorkflow = (ctx: Context) => {
  const taskRepository = createTaskRepository(ctx.get("db"));
  const commandExecutor = createTaskCommandExecutor({ db: ctx.get("db") });

  const resolveBlockedWorkflow = createResolveBlocked(
    taskRepository,
    commandExecutor,
  );

  return resolveBlockedWorkflow;
};

export const constructPauseTaskWorkflow = (ctx: Context) => {
  const taskRepository = createTaskRepository(ctx.get("db"));
  const commandExecutor = createTaskCommandExecutor({ db: ctx.get("db") });

  const pauseTaskWorkflow = createPauseTask(taskRepository, commandExecutor);

  return pauseTaskWorkflow;
};

export const constructResumeTaskWorkflow = (ctx: Context) => {
  const taskRepository = createTaskRepository(ctx.get("db"));
  const commandExecutor = createTaskCommandExecutor({ db: ctx.get("db") });

  const resumeTaskWorkflow = createResumeTask(taskRepository, commandExecutor);

  return resumeTaskWorkflow;
};

export const constructListTasksWorkflow = (ctx: Context) => {
  const taskRepository = createTaskRepository(ctx.get("db"));

  const listTasksWorkflow = createListTasks(taskRepository);

  return listTasksWorkflow;
};

export const constructCompleteTaskWorkflow = (ctx: Context) => {
  const taskRepository = createTaskRepository(ctx.get("db"));
  const commandExecutor = createTaskCommandExecutor({ db: ctx.get("db") });

  const completeTaskWorkflow = createCompleteTask(
    taskRepository,
    commandExecutor,
  );

  return completeTaskWorkflow;
};
