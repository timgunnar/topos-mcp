import * as vscode from "vscode";
import { spawn, ChildProcess } from "child_process";
import * as path from "path";

let serverProcess: ChildProcess | null = null;

export function activate(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand("topos.openDashboard", () => {
    openDashboard(context);
  });
  context.subscriptions.push(disposable);
}

export function deactivate(): void {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

function openDashboard(context: vscode.ExtensionContext): void {
  // 1. Start serve-http if not running
  if (!serverProcess) {
    const mcpPkg = path.join(context.extensionPath, "node_modules", "@timgunnar", "topos-mcp");
    const entry = path.join(mcpPkg, "dist", "index.js");

    serverProcess = spawn("node", [entry, "serve-http"], {
      cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd(),
      stdio: "pipe",
    });

    serverProcess.stdout?.on("data", (data: Buffer) => {
      console.log(`[Topos] ${data.toString().trim()}`);
    });
    serverProcess.stderr?.on("data", (data: Buffer) => {
      console.error(`[Topos] ${data.toString().trim()}`);
    });
    serverProcess.on("exit", (code: number | null) => {
      console.log(`[Topos] server exited with code ${code}`);
      serverProcess = null;
    });
  }

  // 2. Create Webview
  const panel = vscode.window.createWebviewPanel(
    "toposDashboard",
    "Topos Dashboard",
    vscode.ViewColumn.Two,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  // 3. Embed Dashboard via iframe
  panel.webview.html = getWebviewContent();
}

function getWebviewContent(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #0a0a0f; }
    iframe { border: none; width: 100%; height: 100%; }
  </style>
</head>
<body>
  <iframe src="http://localhost:4321"></iframe>
</body>
</html>`;
}
