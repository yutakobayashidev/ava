import {
  McpUiToolResultNotificationSchema,
  useApp,
} from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { useState } from "react";
import { createRoot } from "react-dom/client";

export function UiReact() {
  const [toolResults, setToolResults] = useState<CallToolResult[]>([]);
  const { isConnected, error } = useApp({
    appInfo: {
      name: "ui-react",
      version: "0.1.0",
    },
    capabilities: {},
    onAppCreated: (app) => {
      app.setNotificationHandler(
        McpUiToolResultNotificationSchema,
        async (notification) => {
          setToolResults((prev) => [...prev, notification.params]);
        },
      );
    },
  });

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!isConnected) {
    return <div>Connecting to host application...</div>;
  }

  return (
    <div>
      <h1>UI React App</h1>

      {toolResults.map((result, index) => (
        <div
          key={index}
          style={{ border: "1px solid black", margin: "10px", padding: "10px" }}
        >
          <h2>Tool Result {index + 1}</h2>
          {result.structuredContent ? (
            <pre>{JSON.stringify(result.structuredContent, null, 2)}</pre>
          ) : (
            <p>No structured content</p>
          )}
        </div>
      ))}
    </div>
  );
}

window.addEventListener("load", () => {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error("Root element not found");
  }

  createRoot(root).render(<UiReact />);
});
