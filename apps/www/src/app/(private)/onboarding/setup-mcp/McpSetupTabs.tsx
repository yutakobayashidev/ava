"use client";

import { Icons } from "@/components/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";
import { CopyButton } from "./CopyButton";

export function McpSetupTabs({ mcpUrl }: { mcpUrl: string }) {
  const codexToml = `[features]
rmcp_client = true

[mcp_servers.ava]
url = "${mcpUrl}"
`;
  const mcpJson = JSON.stringify(
    {
      mcpServers: {
        ava: {
          type: "http",
          url: mcpUrl,
        },
      },
    },
    null,
    2,
  );
  const vscodeJson = JSON.stringify(
    {
      servers: {
        ava: {
          type: "http",
          url: mcpUrl,
        },
      },
    },
    null,
    2,
  );

  return (
    <Tabs defaultValue="codex" className="space-y-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            MCPサーバーとは
          </h2>
          <p className="text-sm text-slate-600">
            Model Context
            Protocol（MCP）は、AIエージェントと外部サービスを接続するための仕組みです。
            お使いのコーディングエージェントにAvaのMCPサーバーを追加することで、進捗管理と共有をエージェントから直接行えるようになります。
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            セットアップ手順
          </h2>
          <TabsList>
            <TabsTrigger value="codex" className="gap-2">
              <Icons.codex className="h-4 w-4 text-slate-900" />
              Codex
            </TabsTrigger>
            <TabsTrigger value="claude-code" className="gap-2">
              <Icons.claude className="h-4 w-4 text-[#D97757]" />
              Claude Code
            </TabsTrigger>
            <TabsTrigger value="cursor" className="gap-2">
              <Icons.cursor className="h-4 w-4" />
              Cursor
            </TabsTrigger>
            <TabsTrigger value="vscode" className="gap-2">
              <Icons.vscode className="h-4 w-4 text-[#007ACC]" />
              VSCode
            </TabsTrigger>
          </TabsList>
        </div>
      </div>

      <TabsContent value="claude-code" className="space-y-4">
        <ol className="space-y-3 text-slate-600">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              1
            </span>
            <span>下記の設定をコピー</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              2
            </span>
            <span>
              プロジェクトのルートに{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
                .mcp.json
              </code>{" "}
              を作成して貼り付け
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              3
            </span>
            <span>Claude Codeでプロジェクトを開く</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              4
            </span>
            <span>初回接続時に認証を承認</span>
          </li>
        </ol>

        <div className="space-y-3">
          <div className="relative rounded-lg bg-slate-900 p-4 group">
            <CopyButton text={mcpJson} />
            <pre className="overflow-x-auto text-sm text-slate-100">
              <code>{mcpJson}</code>
            </pre>
          </div>
          <p className="text-sm text-muted-foreground">
            プロジェクトルートの{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
              .mcp.json
            </code>{" "}
            に貼り付けて保存してください。
          </p>
        </div>

        <Alert>
          <AlertCircle />
          <AlertTitle>初回接続について</AlertTitle>
          <AlertDescription>
            初回接続時にブラウザで認証が求められます。「Allow」をクリックしてアクセスを許可してください。
          </AlertDescription>
        </Alert>
      </TabsContent>

      <TabsContent value="cursor" className="space-y-4">
        <ol className="space-y-3 text-slate-600">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              1
            </span>
            <span>下記の設定をコピー</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              2
            </span>
            <span>
              Cursorで{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
                Cmd/Ctrl + Shift + P
              </code>{" "}
              →{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
                Preferences: Open User Settings (JSON)
              </code>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              3
            </span>
            <span>設定を貼り付けて保存</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              4
            </span>
            <span>Cursorを再起動して初回接続時に認証を承認</span>
          </li>
        </ol>

        <div className="space-y-3">
          <div className="relative rounded-lg bg-slate-900 p-4 group">
            <CopyButton text={mcpJson} />
            <pre className="overflow-x-auto text-sm text-slate-100">
              <code>{mcpJson}</code>
            </pre>
          </div>
          <p className="text-sm text-muted-foreground">
            プロジェクトルートの{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
              .cursor/mcp.json
            </code>{" "}
            またはホームディレクトリの{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
              ~/.cursor/mcp.json
            </code>{" "}
            に貼り付けて保存してください。
          </p>
        </div>

        <Alert>
          <AlertCircle />
          <AlertTitle>初回接続について</AlertTitle>
          <AlertDescription>
            初回接続時にブラウザで認証が求められます。「Allow」をクリックしてアクセスを許可してください。
          </AlertDescription>
        </Alert>
      </TabsContent>

      <TabsContent value="vscode" className="space-y-4">
        <ol className="space-y-3 text-slate-600">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              1
            </span>
            <span>下記の設定をコピー</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              2
            </span>
            <span>
              ワークスペースのルートに{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
                .vscode/mcp.json
              </code>{" "}
              ファイルを作成して貼り付け
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              3
            </span>
            <span>
              または、コマンドパレット（
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
                Cmd/Ctrl + Shift + P
              </code>
              ）から{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
                MCP: Add Server
              </code>{" "}
              を実行して設定を追加
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              4
            </span>
            <span>初回接続時に認証を承認</span>
          </li>
        </ol>

        <div className="space-y-3">
          <div className="relative rounded-lg bg-slate-900 p-4 group">
            <CopyButton text={vscodeJson} />
            <pre className="overflow-x-auto text-sm text-slate-100">
              <code>{vscodeJson}</code>
            </pre>
          </div>
          <p className="text-sm text-muted-foreground">
            ワークスペースルートの{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
              .vscode/mcp.json
            </code>{" "}
            に貼り付けて保存してください。VSCodeでは IntelliSense
            がサポートされているため、設定の入力補完が利用できます。
          </p>
        </div>

        <Alert>
          <AlertCircle />
          <AlertTitle>初回接続について</AlertTitle>
          <AlertDescription>
            初回接続時にブラウザで認証が求められます。「Allow」をクリックしてアクセスを許可してください。
          </AlertDescription>
        </Alert>
      </TabsContent>

      <TabsContent value="codex" className="space-y-4">
        <ol className="space-y-3 text-slate-600">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              1
            </span>
            <span>
              Codex CLI または IDE 拡張の設定ファイル{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
                ~/.codex/config.toml
              </code>{" "}
              を開き、以下の設定を追加（OAuth連携には{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
                rmcp_client
              </code>{" "}
              の有効化が必要です）
            </span>
          </li>
        </ol>

        <div className="space-y-3">
          <div className="relative rounded-lg bg-slate-900 p-4 group">
            <CopyButton text={codexToml} />
            <pre className="overflow-x-auto text-sm text-slate-100">
              <code>{codexToml}</code>
            </pre>
          </div>
          <p className="text-sm text-muted-foreground">
            Codex CLIとIDE拡張は同じ設定ファイルを共有します。既に
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
              [features]
            </code>{" "}
            セクションがある場合は、そこに{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
              rmcp_client = true
            </code>{" "}
            を追記してください。
          </p>
        </div>

        <ol className="space-y-3 text-slate-600" start={2}>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              2
            </span>
            <span>Codexを再起動するか、TUI内で設定をリロード</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              3
            </span>
            <span>
              ターミナルで{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
                codex mcp login ava
              </code>{" "}
              を実行し、ブラウザで認可を許可
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              4
            </span>
            <span>
              接続後、利用可能なツール一覧に{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
                start_task
              </code>{" "}
              などが表示されれば準備完了です
            </span>
          </li>
        </ol>

        <Alert>
          <AlertCircle />
          <AlertTitle>OAuth接続について</AlertTitle>
          <AlertDescription>
            AvaのMCPサーバーはOAuth 2.1 +
            PKCEで認可します。Codexで接続する際はブラウザが開くので、許可をクリックしてください。
          </AlertDescription>
        </Alert>
      </TabsContent>
    </Tabs>
  );
}
