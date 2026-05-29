import type { ToposData, Feature, Layer, Module } from "./types.js";
import { readProject, writeProject, findFeature, addHistoryEntry } from "./data.js";
import { writeContext } from "./context.js";

let cwd = process.cwd();
let data: ToposData;

function reload(): void {
  data = readProject(cwd);
}

function save(): void {
  writeProject(cwd, data);
  writeContext(cwd, data);
}

function nextFeatureId(): string {
  let max = 0;
  for (const layer of data.project.layers) {
    for (const mod of layer.modules) {
      for (const feat of mod.features) {
        const num = parseInt(feat.id.replace("feat-", ""), 10);
        if (num > max) max = num;
      }
    }
  }
  return `feat-${String(max + 1).padStart(3, "0")}`;
}

function getOrCreateLayer(name: string): Layer {
  let layer = data.project.layers.find((l) => l.name === name);
  if (!layer) {
    layer = { name, order: data.project.layers.length + 1, modules: [] };
    data.project.layers.push(layer);
  }
  return layer;
}

function getOrCreateModule(layer: Layer, name: string): Module {
  let mod = layer.modules.find((m) => m.name === name);
  if (!mod) {
    mod = { name, features: [] };
    layer.modules.push(mod);
  }
  return mod;
}

export function handleToolCall(name: string, args: Record<string, unknown>): string {
  reload();

  switch (name) {
    case "topos_add_feature": {
      const layer = getOrCreateLayer(args.layer as string);
      const mod = getOrCreateModule(layer, args.module as string);
      const feature: Feature = {
        id: nextFeatureId(),
        title: args.title as string,
        status: "active",
        priority: (args.priority as Feature["priority"]) || "medium",
        source: {
          type: (args.sourceType as Feature["source"]["type"]) || "feature_request",
          ...(args.triggeredBy ? { triggered_by: args.triggeredBy as string } : {}),
          ...(args.relatedTo ? { related_to: args.relatedTo as string } : {}),
        },
        ...(args.dependsOn ? { depends_on: args.dependsOn as string[] } : {}),
        history: [{ at: new Date().toISOString().slice(0, 10), event: "created" }],
      };
      mod.features.push(feature);
      save();
      return JSON.stringify({ ok: true, featureId: feature.id });
    }

    case "topos_mark_progress": {
      const found = findFeature(data, args.featureId as string);
      if (!found) return JSON.stringify({ ok: false, error: "Feature not found" });
      found.feature.status = "in_progress";
      found.feature.progress = args.progress as number;
      addHistoryEntry(found.feature, "progress_updated", `${args.progress}%`);
      save();
      return JSON.stringify({ ok: true });
    }

    case "topos_mark_done": {
      const found = findFeature(data, args.featureId as string);
      if (!found) return JSON.stringify({ ok: false, error: "Feature not found" });
      found.feature.status = "implemented";
      found.feature.progress = 100;
      addHistoryEntry(found.feature, "implemented");
      data.project.plan.current = data.project.plan.current.filter((id) => id !== args.featureId);
      save();
      return JSON.stringify({ ok: true });
    }

    case "topos_mark_deprecated": {
      const found = findFeature(data, args.featureId as string);
      if (!found) return JSON.stringify({ ok: false, error: "Feature not found" });
      found.feature.status = "deprecated";
      found.feature.source.triggered_by = args.reason as string;
      addHistoryEntry(found.feature, "deprecated", args.reason as string);
      data.project.plan.current = data.project.plan.current.filter((id) => id !== args.featureId);
      data.project.plan.next = data.project.plan.next.filter((id) => id !== args.featureId);
      data.project.plan.recently_deprecated.push(args.featureId as string);
      save();
      return JSON.stringify({ ok: true });
    }

    case "topos_get_status": {
      const found = findFeature(data, args.featureId as string);
      if (!found) return JSON.stringify({ ok: false, error: "Feature not found" });
      return JSON.stringify({ ok: true, feature: found.feature, layer: found.layer.name, module: found.module.name });
    }

    case "topos_get_plan": {
      return JSON.stringify({ ok: true, plan: data.project.plan });
    }

    case "topos_list_features": {
      const results: { feature: Feature; layer: string; module: string }[] = [];
      for (const layer of data.project.layers) {
        if (args.layer && layer.name !== args.layer) continue;
        for (const mod of layer.modules) {
          if (args.module && mod.name !== args.module) continue;
          for (const feat of mod.features) {
            if (args.status && feat.status !== args.status) continue;
            results.push({ feature: feat, layer: layer.name, module: mod.name });
          }
        }
      }
      return JSON.stringify({ ok: true, features: results });
    }

    default:
      return JSON.stringify({ ok: false, error: `Unknown tool: ${name}` });
  }
}

export function setCwd(newCwd: string): void {
  cwd = newCwd;
}

export function getData(): ToposData {
  reload();
  return data;
}
