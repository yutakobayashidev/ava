"use client";

import { Icons } from "@/components/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";

export function McpSetupTabs() {
  return (
    <Tabs defaultValue="claude-code" className="space-y-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            MCPサーバーとは
          </h2>
          <p className="text-sm text-slate-600">
            Model Context
            Protocol（MCP）は、AIエージェントと外部サービスを接続するための仕組みです。
            お使いのコーディングエージェントにAvaのMCPサーバーを追加することで、タスク管理機能が自動的に利用可能になります。
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            セットアップ手順
          </h2>
          <TabsList>
            <TabsTrigger value="claude-code" className="gap-2">
              <Icons.claude className="h-4 w-4 text-[#D97757]" />
              Claude Code
            </TabsTrigger>
            <TabsTrigger value="cursor" className="gap-2">
              <Icons.cursor className="h-4 w-4" />
              Cursor
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

        <Alert>
          <AlertCircle />
          <AlertTitle>初回接続について</AlertTitle>
          <AlertDescription>
            初回接続時にブラウザで認証が求められます。「Allow」をクリックしてアクセスを許可してください。
          </AlertDescription>
        </Alert>
      </TabsContent>
    </Tabs>
  );
}
