/**
 * 共有型定義
 * サーバー側とウィジェット側で共通で使用する型をここに定義
 */

// ====================
// Core Domain Types
// ====================

export type TaskStatus = "inProgress" | "blocked" | "paused" | "completed";

export type Task = {
  taskSessionId: string;
  issueProvider: "github" | "manual";
  issueId: string | null;
  issueTitle: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
};

export type TaskListPayload = {
  total: number;
  tasks: Task[];
};

// ====================
// Layout & Display Types
// ====================

export type DisplayMode = "pip" | "inline" | "fullscreen";

export type SafeAreaInsets = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type SafeArea = {
  insets: SafeAreaInsets;
};

export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";

export type UserAgent = {
  device: { type: DeviceType };
  capabilities: {
    hover: boolean;
    touch: boolean;
  };
};

export type Theme = "light" | "dark";

// ====================
// OpenAI Widget Types
// ====================

export type UnknownObject = Record<string, unknown>;

export type UpdateStateFunction<T> = (
  newState: T | ((currentState: T) => T),
) => void;

export type WidgetState = {
  tasks: Task[];
};

export type StructuredContent = {
  tasks: Task[];
  total: number;
};

export type StructuredContentPayload = {
  structuredContent?: unknown;
  result?: unknown;
};

export type CallToolResult = StructuredContentPayload & Record<string, unknown>;

export type ToolOutputPayload = StructuredContentPayload &
  Record<string, unknown>;

// ====================
// OpenAI API Types
// ====================

export type RequestDisplayMode = (args: { mode: DisplayMode }) => Promise<{
  mode: DisplayMode;
}>;

export type CallToolResponse = {
  result: string;
};

export type CallTool = (
  name: string,
  args: Record<string, unknown>,
) => Promise<CallToolResponse>;

type OpenAiAPI = {
  callTool: CallTool;
  sendFollowUpMessage: (args: { prompt: string }) => Promise<void>;
  openExternal(payload: { href: string }): void;
  requestDisplayMode: RequestDisplayMode;
};

export type OpenAiGlobals<
  ToolInput = UnknownObject,
  ToolOutput = UnknownObject,
  ToolResponseMetadata = UnknownObject,
  TWidgetState = UnknownObject,
> = {
  theme: Theme;
  userAgent: UserAgent;
  locale: string;
  maxHeight: number;
  displayMode: DisplayMode;
  safeArea: SafeArea;
  toolInput: ToolInput;
  toolOutput: ToolOutput | null;
  toolResponseMetadata: ToolResponseMetadata | null;
  widgetState: TWidgetState | null;
  setWidgetState: (state: TWidgetState) => Promise<void>;
};

// ====================
// Events
// ====================

export const SET_GLOBALS_EVENT_TYPE = "openai:set_globals";

export class SetGlobalsEvent extends CustomEvent<{
  globals: Partial<OpenAiGlobals>;
}> {
  readonly type = typeof SET_GLOBALS_EVENT_TYPE;
}

// ====================
// Global Declarations
// ====================

declare global {
  interface Window {
    openai: OpenAiAPI & OpenAiGlobals;
  }

  interface WindowEventMap {
    [SET_GLOBALS_EVENT_TYPE]: SetGlobalsEvent;
  }
}
