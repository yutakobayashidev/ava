# @apps-sdk/widget-runtime

Widget runtime package for rendering HTML widget shells.

## Features

- Renders HTML widget shells with optional CSS and JavaScript
- Works with both Hono and Next.js
- Supports both development (external scripts) and production (inline assets) modes

## Installation

```bash
pnpm add @apps-sdk/widget-runtime
```

## Usage

### Basic Usage

```typescript
import { renderWidgetHtml } from "@apps-sdk/widget-runtime";

// Development mode (external script)
const html = renderWidgetHtml("tasks", {
  scriptSrc: "/tasks.js",
});

// Production mode (inline assets)
const html = renderWidgetHtml("tasks", {
  css: "body { margin: 0; }",
  js: "console.log('widget loaded');",
});
```

### Next.js App Router Integration

```typescript
// app/api/widget/tasks/route.ts
import { renderWidgetHtml } from "@apps-sdk/widget-runtime";

export async function GET() {
  const html = renderWidgetHtml("tasks", {
    scriptSrc: "/tasks.js",
  });

  return new Response(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}
```

### Hono Integration

```typescript
import { Hono } from "hono";
import { renderWidgetHtml } from "@apps-sdk/widget-runtime";

const app = new Hono();

app.get("/widget/tasks", async (c) => {
  const html = renderWidgetHtml("tasks", {
    scriptSrc: "/tasks.js",
  });

  return c.html(html);
});
```

## API

### `renderWidgetHtml(widgetName: string, widgetAsset: WidgetAsset): string`

Renders the HTML shell for a widget.

**Parameters:**

- `widgetName` - Name of the widget (e.g., "tasks")
- `widgetAsset` - Widget asset configuration
  - `css?` - Inline CSS content
  - `js?` - Inline JavaScript content
  - `scriptSrc?` - External script source URL

**Returns:** HTML string

### Types

```typescript
interface WidgetAsset {
  css?: string;
  js?: string;
  scriptSrc?: string;
}

interface WidgetShellProps {
  widgetName: string;
  css?: string;
  inlineJs?: string;
  scriptSrc?: string;
}
```

## License

MIT
