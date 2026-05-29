import fs from "node:fs";
import path from "node:path";
import type { ToposData, Feature, Layer, Module } from "./types.js";

export function generateContext(data: ToposData): string {
  const lines: string[] = [
    `## Project: ${data.project.name}`,
    `_Last updated: ${new Date().toISOString().slice(0, 16).replace("T", " ")}_`,
    "",
  ];

  const inProgress = gatherFeatures(data, "in_progress");
  const active = gatherFeatures(data, "active");
  const deprecated = gatherFeatures(data, "deprecated");

  lines.push("### In Progress");
  if (inProgress.length === 0) {
    lines.push("_None_");
  } else {
    for (const { feature, layer } of inProgress) {
      const pct = feature.progress ? ` (${feature.progress}%)` : "";
      const src = sourceLabel(feature);
      lines.push(`- [${src}] **${feature.title}** — ${layer.name}${pct}`);
    }
  }

  lines.push("");
  lines.push("### Planned (Not Started)");
  if (active.length === 0) {
    lines.push("_None_");
  } else {
    for (const { feature, layer } of active) {
      lines.push(`- **${feature.title}** — ${layer.name} [${feature.priority}]`);
    }
  }

  lines.push("");
  lines.push("### Current Plan");
  if (data.project.plan.current.length > 0) {
    for (const id of data.project.plan.current) {
      lines.push(`- [ ] ${id}`);
    }
  }
  if (data.project.plan.next.length > 0) {
    lines.push("");
    lines.push("**Next:**");
    for (const id of data.project.plan.next) {
      lines.push(`- [ ] ${id}`);
    }
  }

  lines.push("");
  lines.push("### Recently Deprecated (DO NOT WORK ON)");
  if (deprecated.length === 0) {
    lines.push("_None_");
  } else {
    for (const { feature, layer } of deprecated) {
      const reason = feature.source.triggered_by || "No reason recorded";
      lines.push(`- ❌ **${feature.title}** (${layer.name}): ${reason}`);
    }
  }

  return lines.join("\n");
}

export function writeContext(cwd: string, data: ToposData): void {
  const md = generateContext(data);
  const filePath = path.join(cwd, ".devion", "agent-context.md");
  fs.writeFileSync(filePath, md, "utf-8");
}

function gatherFeatures(data: ToposData, status: string): { feature: Feature; layer: Layer; module: Module }[] {
  const result: { feature: Feature; layer: Layer; module: Module }[] = [];
  for (const layer of data.project.layers) {
    for (const mod of layer.modules) {
      for (const feature of mod.features) {
        if (feature.status === status) {
          result.push({ feature, layer, module: mod });
        }
      }
    }
  }
  return result;
}

function sourceLabel(feature: Feature): string {
  switch (feature.source.type) {
    case "bug_fix":
      return "BUG";
    case "refactor":
      return "REFACTOR";
    case "optimization":
      return "OPTIMIZE";
    default:
      return "FEAT";
  }
}
