# Topos v0.2.0: VS Code 扩展 & 性能优化 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 VS Code 扩展作为 Dashboard 第二个入口 + Three.js frameloop="demand" 性能优化

**Architecture:** server.ts 加端口占用检测 → index.ts 加 serve-http 命令 → Topology.tsx Canvas 切换 demand 模式 → 新建 vscode-extension 包（Webview 嵌入 Dashboard）

**Tech Stack:** Node.js child_process, VS Code Extension API, React Three Fiber frameloop

---

## 文件清单

| 文件 | 动作 | 职责 |
|------|------|------|
| `packages/mcp-server/src/server.ts` | 修改 | 端口占用检测 (EADDRINUSE) |
| `packages/mcp-server/src/index.ts` | 修改 | 新增 `serve-http` 命令 |
| `packages/dashboard/src/components/Topology.tsx` | 修改 | frameloop="demand" + invalidate |
| `packages/vscode-extension/package.json` | 新建 | 扩展元数据、命令注册 |
| `packages/vscode-extension/tsconfig.json` | 新建 | TypeScript 配置 |
| `packages/vscode-extension/src/extension.ts` | 新建 | activate/deactivate, 子进程管理, Webview |

---

### Task 1: server.ts — 端口占用检测

**Files:**
- Modify: `packages/mcp-server/src/server.ts:121-123`

- [ ] **Step 1: Add EADDRINUSE error handler**

```typescript
// server.listen(PORT, ...) 改为:
const server = http.createServer((req, res) => {
  // ... 现有请求处理逻辑不变 ...
});

// WebSocket 附加到 server 上
const wss = new WebSocketServer({ server });
wss.on("connection", (ws) => {
  clients.add(ws);
  ws.on("close", () => clients.delete(ws));
});

// 端口占用检测
server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.log(`Dashboard already running on http://localhost:${PORT}`);
    return;
  }
  throw err;
});

server.listen(PORT, () => {
  console.log(`Topos Dashboard: http://localhost:${PORT}`);
});
```

注意：需要把 `wss` 和 `server.listen` 从现有位置移出来。当前代码在 createServer 回调内部创建 WebSocketServer 和 listen，但现在 `server` 变量要提前声明以便绑定 error handler。

- [ ] **Step 2: 构建并验证**

```bash
npx tsc -p packages/mcp-server/tsconfig.json
```

预期：编译成功，无错误。

- [ ] **Step 3: 验证端口冲突场景**

```bash
# 终端 1: 启动 serve-http（新建命令前先手动测试）
node packages/mcp-server/dist/index.js serve &
# 终端 2: 再次启动（应打印 Dashboard already running）
node packages/mcp-server/dist/index.js serve
```

预期终端 2 输出: `Dashboard already running on http://localhost:4321`，不崩溃。

- [ ] **Step 4: Commit**

```bash
git add packages/mcp-server/src/server.ts packages/mcp-server/dist/
git commit -m "feat: port conflict detection in HTTP server (EADDRINUSE)"
```

---

### Task 2: index.ts — serve-http 命令

**Files:**
- Modify: `packages/mcp-server/src/index.ts:93-115`

- [ ] **Step 1: 抽取 runServeHttp 函数**

在 main() 上面新增 `runServeHttp`：

```typescript
async function runServeHttp(): Promise<void> {
  const cwd = process.cwd();
  setCwd(cwd);
  ensureDevionDir(cwd);
  startServer(cwd);
}
```

- [ ] **Step 2: 在 switch 和帮助文本中注册 serve-http**

```typescript
// switch 中加一个 case:
case "serve-http":
  await runServeHttp();
  break;

// help text 中加一行:
console.log("  serve-http  Start Dashboard server (HTTP + WebSocket only, no MCP)");
```

- [ ] **Step 3: 构建并验证**

```bash
npx tsc -p packages/mcp-server/tsconfig.json
```

预期：编译成功。

- [ ] **Step 4: 验证 serve-http 命令**

```bash
# 终端 1
node packages/mcp-server/dist/index.js serve-http
# 预期输出: Topos Dashboard: http://localhost:4321

# 终端 2 验证浏览器可访问
curl http://localhost:4321/api/project
# 预期: JSON 响应
```

- [ ] **Step 5: Commit**

```bash
git add packages/mcp-server/src/index.ts packages/mcp-server/dist/
git commit -m "feat: add serve-http command (HTTP only, no MCP stdio)"
```

---

### Task 3: Topology.tsx — frameloop="demand" 性能优化

**Files:**
- Modify: `packages/dashboard/src/components/Topology.tsx:238` (Canvas) + `packages/dashboard/src/components/Topology.tsx:1-2` (import)

- [ ] **Step 1: Canvas 加 frameloop="demand"**

```tsx
// 238 行附近
<Canvas
  camera={{ position: [8, 6, 15], fov: 50 }}
  style={{ background: "#0a0a0f" }}
  frameloop="demand"
>
```

- [ ] **Step 2: NodeSphere useFrame 中添加 invalidate**

```tsx
// 第 1 行 import 加 invalidate
import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";

// NodeSphere 组件内获取 invalidate
function NodeSphere(...) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { invalidate } = useThree();  // 新增
  // ... existing code ...

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    if (feature.status === "in_progress") {
      const pulse = 1 + Math.sin(clock.elapsedTime * 3) * 0.15;
      meshRef.current.scale.setScalar(pulse);
      invalidate();  // 新增：按需继续渲染
    } else {
      meshRef.current.scale.setScalar(1);
    }
    if (bugAlert) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      const alert = Math.sin(clock.elapsedTime * 5) * 0.5 + 0.5;
      mat.emissive = new THREE.Color().lerpColors(
        new THREE.Color("#000000"),
        new THREE.Color("#ef4444"),
        alert
      );
      invalidate();  // 新增：按需继续渲染
    }
  });
  // ...
}
```

- [ ] **Step 3: 构建 dashboard**

```bash
npx vite build --outDir dist packages/dashboard/
```

- [ ] **Step 4: 验证性能**

```bash
node packages/mcp-server/dist/index.js serve-http &
# 浏览器打开 http://localhost:4321
# DevTools Performance 面板验证：没有持续 requestAnimationFrame
# 修改 feature 状态验证：WebSocket 推送后 Canvas 正常更新
```

- [ ] **Step 5: Commit**

```bash
git add packages/dashboard/src/components/Topology.tsx packages/dashboard/dist/
git commit -m "perf: use frameloop=demand to reduce idle GPU usage"
```

---

### Task 4: VS Code 扩展 — 项目脚手架

**Files:**
- Create: `packages/vscode-extension/package.json`
- Create: `packages/vscode-extension/tsconfig.json`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "topos-vscode",
  "displayName": "Topos MCP",
  "description": "3D 拓扑仪表盘 — AI Agent 驱动开发的项目智能追踪",
  "version": "0.2.0",
  "private": true,
  "publisher": "timgunnar",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/timgunnar/topos-mcp"
  },
  "engines": {
    "vscode": "^1.85.0"
  },
  "activationEvents": ["onCommand:topos.openDashboard"],
  "main": "./dist/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "topos.openDashboard",
        "title": "Open Dashboard",
        "category": "Topos"
      }
    ]
  },
  "scripts": {
    "build": "tsc",
    "package": "vsce package"
  },
  "dependencies": {
    "@timgunnar/topos-mcp": "0.2.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/vscode": "^1.85.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

注意：VS Code 扩展必须用 commonjs 模块。

- [ ] **Step 3: 安装依赖**

```bash
cd packages/vscode-extension && npm install
```

- [ ] **Step 4: Commit**

```bash
git add packages/vscode-extension/package.json packages/vscode-extension/tsconfig.json packages/vscode-extension/package-lock.json
git commit -m "feat: scaffold VS Code extension package"
```

---

### Task 5: VS Code 扩展 — extension.ts 核心逻辑

**Files:**
- Create: `packages/vscode-extension/src/extension.ts`

- [ ] **Step 1: 实现 activate/deactivate**

```typescript
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
  // 1. 确保 serve-http 在运行
  if (!serverProcess) {
    const extPath = context.extensionPath;
    const mcpPkg = path.join(extPath, "node_modules", "@timgunnar", "topos-mcp");
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

  // 2. 创建 Webview
  const panel = vscode.window.createWebviewPanel(
    "toposDashboard",
    "Topos Dashboard",
    vscode.ViewColumn.Two,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  // 3. 嵌入 Dashboard（iframe 指向 localhost:4321）
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
```

- [ ] **Step 2: 构建扩展**

```bash
cd packages/vscode-extension && npx tsc
```

- [ ] **Step 3: 验证**

在 VS Code 中按 F5（Extension Development Host）测试：
- 命令面板 → `Topos: Open Dashboard`
- 预期：右侧打开 Webview，显示 Topos Dashboard
- 关闭命令面板后再次打开，Webview 仍然连得上（server 已在运行）

- [ ] **Step 4: Commit**

```bash
git add packages/vscode-extension/src/extension.ts packages/vscode-extension/dist/
git commit -m "feat: VS Code extension - Webview Dashboard with serve-http child process"
```

---

### Task 6: 端到端验证 & 版本更新

- [ ] **Step 1: 更新版本号**

```bash
# packages/mcp-server/package.json: version → 0.2.0
# 用 Edit 工具分别更新
```

- [ ] **Step 2: 更新 CHANGELOG.md**

在 CHANGELOG.md 顶部添加 v0.2.0 条目：

```markdown
## v0.2.0

### 关键升级

- VS Code 扩展 (`topos-vscode`)：Webview 内嵌 3D Dashboard
- `serve-http` 命令：仅启动 HTTP + WebSocket，不含 MCP stdio
- 端口占用检测：多个进程可复用同一 Dashboard 实例
- Three.js 性能优化：`frameloop="demand"`，idle 时零 GPU 占用
```

- [ ] **Step 3: 端到端测试**

```bash
# 1. 安装依赖
npm install

# 2. 构建所有包
npm run build

# 3. 测试 serve-http
node packages/mcp-server/dist/index.js serve-http &
# 浏览器打开 http://localhost:4321 → 3D 拓扑正常
# curl http://localhost:4321/api/project → JSON 正常

# 4. 测试端口冲突
node packages/mcp-server/dist/index.js serve-http
# 预期: Dashboard already running on http://localhost:4321

# 5. VS Code 扩展
cd packages/vscode-extension && npm run build
# 然后在 VS Code 中 F5 测试
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "release: v0.2.0 - VS Code extension and performance optimization"
git push origin master
```
