#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { tools } from "./tools.js";
import { handleToolCall, setCwd } from "./mcp.js";
import { ensureDevionDir, readProject } from "./data.js";
import { writeContext } from "./context.js";
import { startServer } from "./server.js";

const args = process.argv.slice(2);
const command = args[0];

async function runServe(): Promise<void> {
  const cwd = process.cwd();
  setCwd(cwd);
  ensureDevionDir(cwd);

  // Start Dashboard server in background
  startServer(cwd);

  // Start MCP server
  const server = new Server(
    { name: "topos", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const result = handleToolCall(request.params.name, request.params.arguments || {});
    return { content: [{ type: "text", text: result }] };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

async function runInit(): Promise<void> {
  const cwd = process.cwd();
  setCwd(cwd);
  ensureDevionDir(cwd);
  const data = readProject(cwd);
  writeContext(cwd, data);
  console.log(`Topos initialized in ${cwd}/.devion/`);
  console.log("  project.yaml — project data");
  console.log("  agent-context.md — agent-readable summary");
  console.log("");
  console.log('Add to Claude Code config:');
  console.log('  { "mcpServers": { "topos": { "command": "npx", "args": ["@topos/mcp", "serve"] } } }');
}

async function main(): Promise<void> {
  switch (command) {
    case "init":
      await runInit();
      break;
    case "serve":
      await runServe();
      break;
    default:
      console.log("topos — project intelligence for AI-agent-driven development");
      console.log("");
      console.log("Usage: topos <command>");
      console.log("  init    Initialize Topos in the current project");
      console.log("  serve   Start MCP server + Dashboard");
  }
}

main().catch(console.error);
