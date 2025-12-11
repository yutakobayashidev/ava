import { render } from "hono/jsx/dom";

import "../../globals.css";
import { CompleteTaskApp } from "./controller";

const root = document.getElementById("complete-task-root");

if (root) {
  render(<CompleteTaskApp />, root);
} else {
  console.warn("Complete task root element was not found.");
}

export {};
