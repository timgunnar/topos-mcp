import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const tools: Tool[] = [
  {
    name: "topos_add_feature",
    description: "Record a new feature request. Creates a feature in the specified layer and module.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Feature name/title" },
        layer: { type: "string", description: "Architecture layer this belongs to" },
        module: { type: "string", description: "Module within the layer" },
        description: { type: "string", description: "What this feature does" },
        priority: { type: "string", enum: ["low", "medium", "high", "critical"], description: "Priority level" },
        sourceType: { type: "string", enum: ["feature_request", "bug_fix", "refactor", "optimization"], description: "What triggered this feature" },
        triggeredBy: { type: "string", description: "For bug_fix/refactor: what triggered it" },
        relatedTo: { type: "string", description: "For bug_fix: ID of related original feature" },
        dependsOn: { type: "array", items: { type: "string" }, description: "Feature IDs this depends on" },
      },
      required: ["title", "layer", "module"],
    },
  },
  {
    name: "topos_mark_progress",
    description: "Update the progress percentage of a feature.",
    inputSchema: {
      type: "object",
      properties: {
        featureId: { type: "string", description: "Feature ID" },
        progress: { type: "number", description: "Progress percentage (0-100)" },
      },
      required: ["featureId", "progress"],
    },
  },
  {
    name: "topos_mark_done",
    description: "Mark a feature as fully implemented.",
    inputSchema: {
      type: "object",
      properties: {
        featureId: { type: "string", description: "Feature ID" },
      },
      required: ["featureId"],
    },
  },
  {
    name: "topos_mark_deprecated",
    description: "Mark a feature as deprecated/cancelled. Agent must stop working on it.",
    inputSchema: {
      type: "object",
      properties: {
        featureId: { type: "string", description: "Feature ID" },
        reason: { type: "string", description: "Why it was deprecated" },
      },
      required: ["featureId", "reason"],
    },
  },
  {
    name: "topos_get_status",
    description: "Get the current status and full details of a specific feature.",
    inputSchema: {
      type: "object",
      properties: {
        featureId: { type: "string", description: "Feature ID to query" },
      },
      required: ["featureId"],
    },
  },
  {
    name: "topos_get_plan",
    description: "Get the current agent plan: what to work on now and next.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "topos_list_features",
    description: "List all features in a module or layer.",
    inputSchema: {
      type: "object",
      properties: {
        layer: { type: "string", description: "Filter by layer name" },
        module: { type: "string", description: "Filter by module name" },
        status: { type: "string", enum: ["active", "in_progress", "implemented", "deprecated"], description: "Filter by status" },
      },
    },
  },
];
