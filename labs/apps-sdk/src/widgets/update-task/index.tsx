import { render } from "hono/jsx/dom";

import "../../globals.css";
import { UpdateTaskApp } from "./controller";

const root = document.getElementById("update-task-root");

if (root) {
  render(<UpdateTaskApp />, root);
} else {
  console.warn("Update task root element was not found.");
}

export {};
