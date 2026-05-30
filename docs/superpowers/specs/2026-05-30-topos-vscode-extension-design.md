# Topos v0.2.0: VS Code 扩展 & 性能优化

> **Requirement:** Use superpowers:writing-plans to create implementation plan from this spec.

**Goal:** 新增 VS Code 扩展作为 Dashboard 第二个入口，同时优化 3D 渲染性能。

**Architecture:** VS Code 扩展启动 serve-http 子进程（仅 HTTP + WebSocket，不含 MCP stdio），WebviewPanel 嵌入现有 Dashboard HTML。端口占用检测确保扩展和浏览器可同时访问。Three.js Canvas 从 frameloop="always" 改为 "demand"，仅数据变更时重绘。

**Tech Stack:** VS Code Extension API, Webview API, child_process, Three.js / React Three Fiber frameloop

---

## v0.2.0 范围

### 1. VS Code 扩展 (`packages/vscode-extension/`)

#### extension.ts

- activate: 注册命令 `topos.openDashboard`
- 命令逻辑：查找 `@timgunnar/topos-mcp` 中的 `serve-http` 入口
- spawn `node <mcp-server>/dist/index.js serve-http` 子进程
- 创建 WebviewPanel，`panel.webview.html` 指向 `http://localhost:4321`
- deactivate: 清理子进程

#### package.json

- name: `topos-vscode`
- displayName: "Topos MCP"
- contributes.commands: `topos.openDashboard`
- activationEvents: `onCommand:topos.openDashboard`
- engines.vscode: `^1.85.0`

#### 子进程管理

- 每次 activate 只 spawn 一个子进程
- 子进程崩溃 → Webview 显示错误，不阻塞 VS Code
- deactivate 时 kill 子进程

### 2. mcp-server 改动

#### server.ts: 端口占用检测

```typescript
// startServer 开头
const server = http.createServer(...);

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.log(`Dashboard already running on http://localhost:${PORT}`);
  } else {
    throw err;
  }
});

server.listen(PORT, () => { ... });
```

- 端口被占用时不报错，仅打印信息
- 对已有连接的客户端无影响

#### index.ts: 新增 serve-http 命令

- `topos serve` → 同时启动 MCP stdio + HTTP（现有行为不变）
- `topos serve-http` → 仅启动 HTTP + WebSocket，**不**启动 MCP stdio
- `serve-http` 调用 `startServer(cwd)` 不调用 `server.connect(transport)`

### 3. Dashboard 性能优化

#### Topology.tsx `Canvas frameloop`

```tsx
// 改前
<Canvas camera={{ position: [8, 6, 15], fov: 50 }} style={{ background: "#0a0a0f" }}>

// 改后
<Canvas
  camera={{ position: [8, 6, 15], fov: 50 }}
  style={{ background: "#0a0a0f" }}
  frameloop="demand"
>
```

- `frameloop="demand"` — 仅在 state 变化或用户交互时渲染，平时不执行 requestAnimationFrame
- WebSocket 数据更新会触发 React rerender → Canvas 自动 invalidate → 重绘一帧
- 脉冲动画在 `demand` 模式下需要用 `useFrame` + `invalidate` 手动触发

**脉冲动画适配：** 在 `useFrame` 中仅当存在 in_progress 或 bug_fix 节点时调用 `invalidate()`，否则不触发持续渲染：

```tsx
// NodeSphere useFrame 内
if (feature.status === "in_progress" || bugAlert) {
  invalidate(); // 通知 Canvas 需要继续渲染
}
```

### 4. 不做的

- Sidebar Tree View、Status Bar、CodeLens → 留到后续版本
- postMessage 替代 WebSocket → 当前 WebSocket 即插即用
- 多项目 Dashboard 切换 → 后续

---

## 数据流（不变）

```
Agent (MCP stdio) → mcp.ts → project.yaml → server.ts → WebSocket
                                                          │
                      agent-context.md                    ├→ VS Code Webview
                                                          └→ 浏览器
```

## 构建 & 发布

| 包 | 发布目标 | 方式 |
|----|---------|------|
| `@timgunnar/topos-mcp` | npm | `npm publish -w @timgunnar/topos-mcp --access public` |
| `topos-vscode` | VS Code Marketplace | `vsce publish` |

Dashboard 构建产物仍由 mcp-server 引用，扩展通过 node_modules 获取。
