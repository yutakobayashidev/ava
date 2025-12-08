import { TasksRoute } from "@/handlers/api/tasks";
import { hc } from "hono/client";
import { absoluteUrl } from "@/lib/utils";

export const tasksClient = hc<TasksRoute>(absoluteUrl("/api/tasks"));
