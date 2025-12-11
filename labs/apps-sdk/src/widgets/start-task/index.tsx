import { render } from "hono/jsx/dom";

import "../../globals.css";
import { StartTaskApp } from "./controller";

const root = document.getElementById("start-task-root");

if (root) {
  render(<StartTaskApp />, root);
} else {
  console.warn("Start task root element was not found.");
}

export {};
