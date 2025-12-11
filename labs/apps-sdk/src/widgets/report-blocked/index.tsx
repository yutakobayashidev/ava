import { render } from "hono/jsx/dom";

import "../../globals.css";
import { ReportBlockedApp } from "./controller";

const root = document.getElementById("report-blocked-root");

if (root) {
  render(<ReportBlockedApp />, root);
} else {
  console.warn("Report blocked root element was not found.");
}

export {};
