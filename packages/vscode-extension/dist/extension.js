"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
let serverProcess = null;
function activate(context) {
    const disposable = vscode.commands.registerCommand("topos.openDashboard", () => {
        openDashboard(context);
    });
    context.subscriptions.push(disposable);
}
function deactivate() {
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
    }
}
function openDashboard(context) {
    // 1. Start serve-http if not running
    if (!serverProcess) {
        const mcpPkg = path.join(context.extensionPath, "node_modules", "@timgunnar", "topos-mcp");
        const entry = path.join(mcpPkg, "dist", "index.js");
        serverProcess = (0, child_process_1.spawn)("node", [entry, "serve-http"], {
            cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd(),
            stdio: "pipe",
        });
        serverProcess.stdout?.on("data", (data) => {
            console.log(`[Topos] ${data.toString().trim()}`);
        });
        serverProcess.stderr?.on("data", (data) => {
            console.error(`[Topos] ${data.toString().trim()}`);
        });
        serverProcess.on("exit", (code) => {
            console.log(`[Topos] server exited with code ${code}`);
            serverProcess = null;
        });
    }
    // 2. Create Webview
    const panel = vscode.window.createWebviewPanel("toposDashboard", "Topos Dashboard", vscode.ViewColumn.Two, { enableScripts: true, retainContextWhenHidden: true });
    // 3. Embed Dashboard via iframe
    panel.webview.html = getWebviewContent();
}
function getWebviewContent() {
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
