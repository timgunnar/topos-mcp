import { useState, useEffect, useRef } from "react";
import type { ToposData, Feature } from "../api";

interface Props {
  featureId: string;
  data: ToposData;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Feature>) => void;
}

/* ---------- helpers ---------- */

const STATUS_LABEL: Record<Feature["status"], string> = {
  implemented: "已实现",
  in_progress: "实现中",
  active: "已规划",
  deprecated: "已作废",
};

const STATUS_COLOR: Record<Feature["status"], string> = {
  implemented: "#22c55e",
  in_progress: "#3b82f6",
  active: "#9ca3af",
  deprecated: "#4b5563",
};

const SOURCE_LABEL: Record<Feature["source"]["type"], string> = {
  feature_request: "功能需求",
  bug_fix: "缺陷修复",
  refactor: "重构优化",
  optimization: "性能优化",
};

const SOURCE_COLOR: Record<Feature["source"]["type"], string> = {
  feature_request: "#e0e0e0",
  bug_fix: "#ef4444",
  refactor: "#a855f7",
  optimization: "#eab308",
};

const PRIORITY_LABEL: Record<Feature["priority"], string> = {
  low: "低",
  medium: "中",
  high: "高",
  critical: "严重",
};

const PRIORITY_COLOR: Record<Feature["priority"], string> = {
  low: "#6b7280",
  medium: "#eab308",
  high: "#f97316",
  critical: "#ef4444",
};

const HISTORY_LABEL: Record<string, string> = {
  created: "创建",
  implemented: "已实现",
  progress_updated: "进度更新",
  deprecated: "已作废",
  manually_corrected: "手动修正",
};

function findFeature(data: ToposData, id: string) {
  for (const layer of data.project.layers) {
    for (const mod of layer.modules) {
      const feature = mod.features.find((f) => f.id === id);
      if (feature) {
        return { feature, layerName: layer.name, moduleName: mod.name };
      }
    }
  }
  return null;
}

/* ---------- styles ---------- */

const panel: React.CSSProperties = {
  position: "absolute",
  right: 0,
  top: 0,
  height: "100%",
  width: 360,
  background: "rgba(10, 10, 20, 0.95)",
  backdropFilter: "blur(12px)",
  borderLeft: "1px solid #1f2937",
  color: "#e0e0e0",
  display: "flex",
  flexDirection: "column",
  zIndex: 50,
  overflow: "hidden",
};

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px 20px",
  borderBottom: "1px solid #1f2937",
  flexShrink: 0,
};

const title: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  margin: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  maxWidth: 280,
};

const closeBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#9ca3af",
  fontSize: 20,
  cursor: "pointer",
  padding: "4px 8px",
  borderRadius: 4,
};

const scrollBody: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "16px 20px",
};

const section: React.CSSProperties = {
  marginBottom: 20,
};

const label: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#9ca3af",
  marginBottom: 6,
};

const badge: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: 9999,
  fontSize: 13,
  fontWeight: 500,
};

const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const progressBg: React.CSSProperties = {
  height: 6,
  borderRadius: 3,
  background: "#1f2937",
  marginTop: 6,
  overflow: "hidden",
};

const depList: React.CSSProperties = {
  fontSize: 13,
  color: "#9ca3af",
  margin: 0,
  paddingLeft: 16,
};

const timelineItem: React.CSSProperties = {
  borderLeft: "2px solid #374151",
  paddingLeft: 12,
  paddingBottom: 12,
  position: "relative",
};

const timelineDot: React.CSSProperties = {
  position: "absolute",
  left: -5,
  top: 4,
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "#6b7280",
};

const select: React.CSSProperties = {
  width: "100%",
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #1f2937",
  background: "#111827",
  color: "#e0e0e0",
  fontSize: 14,
  marginBottom: 10,
};

const actionBtn: React.CSSProperties = {
  width: "100%",
  padding: "8px 0",
  borderRadius: 6,
  border: "1px solid #374151",
  background: "transparent",
  color: "#f87171",
  fontSize: 14,
  cursor: "pointer",
};

/* ---------- component ---------- */

export default function Inspector({ featureId, data, onClose, onUpdate }: Props) {
  const result = findFeature(data, featureId);

  // slide-in animation
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // trigger after mount so the transition fires
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!result) {
    return (
      <div style={panel}>
        <div style={header}>
          <h2 style={title}>未找到特性</h2>
          <button style={closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>
        <div style={{ ...scrollBody, color: "#9ca3af" }}>
          特性 ID "{featureId}" 未在数据中找到。
        </div>
      </div>
    );
  }

  const { feature, layerName, moduleName } = result;

  return (
    <div
      ref={panelRef}
      style={{
        ...panel,
        transform: visible ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s ease",
      }}
    >
      {/* ---- header ---- */}
      <div style={header}>
        <h2 style={title}>{feature.title}</h2>
        <button style={closeBtn} onClick={onClose}>
          ✕
        </button>
      </div>

      {/* ---- body ---- */}
      <div style={scrollBody}>
        {/* status */}
        <div style={section}>
          <div style={label}>状态</div>
          <span
            style={{
              ...badge,
              background: STATUS_COLOR[feature.status],
              color: "#fff",
              textDecoration:
                feature.status === "deprecated" ? "line-through" : "none",
            }}
          >
            {STATUS_LABEL[feature.status]}
          </span>
        </div>

        {/* source type */}
        <div style={section}>
          <div style={label}>类型</div>
          <span
            style={{
              ...badge,
              background: SOURCE_COLOR[feature.source.type],
              color: "#111827",
            }}
          >
            {SOURCE_LABEL[feature.source.type]}
          </span>
        </div>

        {/* priority */}
        <div style={section}>
          <div style={label}>优先级</div>
          <div style={row}>
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: PRIORITY_COLOR[feature.priority],
              }}
            />
            <span style={{ fontSize: 14 }}>
              {PRIORITY_LABEL[feature.priority]}
            </span>
          </div>
        </div>

        {/* progress (only for in_progress) */}
        {feature.status === "in_progress" && feature.progress != null && (
          <div style={section}>
            <div style={label}>进度 ({feature.progress}%)</div>
            <div style={progressBg}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, Math.max(0, feature.progress))}%`,
                  background: "#3b82f6",
                  borderRadius: 3,
                  transition: "width 0.2s ease",
                }}
              />
            </div>
          </div>
        )}

        {/* layer & module */}
        <div style={section}>
          <div style={label}>所属</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>
            {layerName} / {moduleName}
          </div>
        </div>

        {/* dependencies */}
        {feature.depends_on && feature.depends_on.length > 0 && (
          <div style={section}>
            <div style={label}>依赖</div>
            <ul style={depList}>
              {feature.depends_on.map((id) => (
                <li key={id} style={{ marginBottom: 2 }}>
                  {id}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* source details */}
        {(feature.source.triggered_by || feature.source.related_to) && (
          <div style={section}>
            <div style={label}>来源详情</div>
            {feature.source.triggered_by && (
              <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 4 }}>
                触发自: {feature.source.triggered_by}
              </div>
            )}
            {feature.source.related_to && (
              <div style={{ fontSize: 13, color: "#9ca3af" }}>
                关联: {feature.source.related_to}
              </div>
            )}
          </div>
        )}

        {/* history timeline */}
        {feature.history.length > 0 && (
          <div style={section}>
            <div style={label}>时间线</div>
            {[...feature.history]
              .sort(
                (a, b) =>
                  new Date(b.at).getTime() - new Date(a.at).getTime()
              )
              .map((entry, i) => (
                <div
                  key={i}
                  style={{
                    ...timelineItem,
                    ...(i === feature.history.length - 1
                      ? { paddingBottom: 0, borderLeftColor: "transparent" }
                      : {}),
                  }}
                >
                  <div style={timelineDot} />
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>
                    {new Date(entry.at).toLocaleString("zh-CN", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {HISTORY_LABEL[entry.event] ?? entry.event}
                  </div>
                  {entry.detail && (
                    <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                      {entry.detail}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* ---- manual correction ---- */}
        <div style={{ ...section, borderTop: "1px solid #1f2937", paddingTop: 16 }}>
          <div style={{ ...label, marginBottom: 10 }}>手动修正</div>

          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>
            更改状态
          </div>
          <select
            style={select}
            value={feature.status}
            onChange={(e) =>
              onUpdate(feature.id, {
                status: e.target.value as Feature["status"],
              })
            }
          >
            {(Object.keys(STATUS_LABEL) as Feature["status"][]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>

          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>
            更改优先级
          </div>
          <select
            style={select}
            value={feature.priority}
            onChange={(e) =>
              onUpdate(feature.id, {
                priority: e.target.value as Feature["priority"],
              })
            }
          >
            {(Object.keys(PRIORITY_LABEL) as Feature["priority"][]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>

          {feature.status !== "deprecated" && (
            <button
              style={actionBtn}
              onClick={() =>
                onUpdate(feature.id, { status: "deprecated" })
              }
            >
              作废此特性
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
