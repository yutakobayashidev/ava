import { TasksRoute } from "@/handlers/api/tasks";
import { hc } from "hono/client";
import { absoluteUrl } from "@/lib/utils";

export const createTasksClient = (cookies: string) =>
  hc<TasksRoute>(absoluteUrl("/api/tasks"), {
    headers: {
      Cookie: cookies,
    },
  });
