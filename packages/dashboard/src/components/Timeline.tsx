import { useMemo, useRef, useCallback } from "react";
import type { ToposData } from "../api";

/* ---------- types ---------- */

interface Props {
  data: ToposData;
  value: number; // 0 to 1, current scrub position
  onChange: (value: number) => void;
}

/* ---------- helpers ---------- */

function collectDates(data: ToposData): string[] {
  const dateSet = new Set<string>();
  for (const layer of data.project.layers) {
    for (const mod of layer.modules) {
      for (const feature of mod.features) {
        for (const entry of feature.history) {
          dateSet.add(entry.at);
        }
      }
    }
  }
  return Array.from(dateSet).sort();
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/* ---------- styles ---------- */

const container: React.CSSProperties = {
  position: "absolute",
  bottom: 40,
  left: "50%",
  transform: "translateX(-50%)",
  width: "60%",
  minHeight: 40,
  background: "rgba(10, 10, 20, 0.8)",
  border: "1px solid #1f2937",
  borderRadius: 8,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 20px",
  boxSizing: "border-box",
  userSelect: "none",
  zIndex: 10,
};

const emptyText: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: 12,
  fontFamily: "monospace",
};

const labelsRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  width: "100%",
  marginBottom: 8,
};

const labelEarliest: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: 11,
  fontFamily: "monospace",
};

const labelCurrent: React.CSSProperties = {
  color: "#e5e7eb",
  fontSize: 11,
  fontFamily: "monospace",
  fontWeight: 600,
};

const labelLatest: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: 11,
  fontFamily: "monospace",
};

const trackContainer: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: 24,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
};

const trackContainerDisabled: React.CSSProperties = {
  ...trackContainer,
  cursor: "not-allowed",
};

const trackLine: React.CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  height: 2,
  background: "#374151",
  borderRadius: 1,
};

const activeTrack: React.CSSProperties = {
  position: "absolute",
  left: 0,
  height: 2,
  background: "#3b82f6",
  borderRadius: 1,
  pointerEvents: "none",
};

const tick: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  transform: "translate(-50%, -50%)",
  width: 2,
  height: 10,
  background: "#4b5563",
  borderRadius: 1,
  pointerEvents: "none",
};

const thumb: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  transform: "translate(-50%, -50%)",
  width: 14,
  height: 14,
  borderRadius: "50%",
  background: "#3b82f6",
  border: "2px solid #0a0a14",
  boxShadow: "0 0 4px rgba(59, 130, 246, 0.5)",
  pointerEvents: "none",
  zIndex: 2,
};

/* ---------- component ---------- */

export default function Timeline({ data, value, onChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  const dates = useMemo(() => collectDates(data), [data]);
  const hasData = dates.length > 0;

  const currentDate = useMemo(() => {
    if (!hasData) return "";
    if (dates.length === 1) return dates[0];
    const idx = Math.round(value * (dates.length - 1));
    return dates[clamp(idx, 0, dates.length - 1)];
  }, [dates, value, hasData]);

  const ticks = useMemo(() => {
    if (dates.length < 2) return [];
    return dates.map((_, i) => (i / (dates.length - 1)) * 100);
  }, [dates]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!hasData) return;
      const track = trackRef.current;
      if (!track) return;

      // capture pointer so we receive events even outside the element
      track.setPointerCapture(e.pointerId);

      const updateFromEvent = (ev: PointerEvent) => {
        const rect = track.getBoundingClientRect();
        const x = clamp(ev.clientX - rect.left, 0, rect.width);
        onChange(x / rect.width);
      };

      updateFromEvent(e.nativeEvent);

      const handleMove = (ev: PointerEvent) => {
        updateFromEvent(ev);
      };

      const handleUp = () => {
        track.removeEventListener("pointermove", handleMove);
        track.removeEventListener("pointerup", handleUp);
      };

      track.addEventListener("pointermove", handleMove);
      track.addEventListener("pointerup", handleUp);
    },
    [hasData, onChange],
  );

  const thumbLeft = `${value * 100}%`;

  return (
    <div style={container}>
      {!hasData ? (
        <span style={emptyText}>暂无历史数据</span>
      ) : (
        <>
          {/* ---- date labels ---- */}
          <div style={labelsRow}>
            <span style={labelEarliest}>{dates[0]}</span>
            <span style={labelCurrent}>{currentDate}</span>
            <span style={labelLatest}>{dates[dates.length - 1]}</span>
          </div>

          {/* ---- custom slider ---- */}
          <div
            ref={trackRef}
            onPointerDown={handlePointerDown}
            style={hasData ? trackContainer : trackContainerDisabled}
          >
            {/* track line */}
            <div style={trackLine} />

            {/* tick marks */}
            {ticks.map((pos, i) => (
              <div key={i} style={{ ...tick, left: `${pos}%` }} />
            ))}

            {/* active (filled) portion of track */}
            <div style={{ ...activeTrack, width: thumbLeft }} />

            {/* thumb */}
            <div style={{ ...thumb, left: thumbLeft }} />
          </div>
        </>
      )}
    </div>
  );
}
