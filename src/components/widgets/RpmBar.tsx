import type { CSSProperties } from "react";
import type { StatBoxStyle, WidgetMode } from "./StatBox";
import "./hud-widgets.css";

export interface RpmZone {
  upTo: number;
  color: string;
}

export type RpmFillDirection = "left-to-right" | "edge-to-center";

export interface RpmBarProps {
  rpm?: number | null;
  redline?: number;
  segments?: number;
  zones?: RpmZone[];
  fillDirection?: RpmFillDirection;
  style?: StatBoxStyle;
  className?: string;
  mode?: WidgetMode;
}

const DEFAULT_ZONES: RpmZone[] = [
  { upTo: 0.6, color: "#2ee66b" },
  { upTo: 0.85, color: "#ffd400" },
  { upTo: 1, color: "#ff3b30" },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function colorForProgress(progress: number, zones: RpmZone[]): string {
  return zones.find((zone) => progress <= zone.upTo)?.color ?? zones.at(-1)?.color ?? "#ffffff";
}

export function RpmBar({
  rpm,
  redline = 8000,
  segments = 16,
  zones = DEFAULT_ZONES,
  fillDirection = "edge-to-center",
  style,
  className,
  mode = "display",
}: RpmBarProps) {
  const safeSegments = Math.max(1, Math.floor(segments));
  const progress = rpm == null || redline <= 0 ? 0 : clamp(rpm / redline, 0, 1);
  const filledSegments = Math.ceil(progress * safeSegments);
  const cssVars = {
    "--box-bg": style?.boxBg ?? "#141820",
    "--box-border": style?.boxBorder ?? "#2a3340",
  } as CSSProperties;

  return (
    <div className={`rpm-bar ${className ?? ""}`} style={cssVars} data-mode={mode}>
      <div className="rpm-bar__segments" aria-label="RPM">
        {Array.from({ length: safeSegments }, (_, index) => {
          const isFilled =
            fillDirection === "left-to-right"
              ? index < filledSegments
              : index < Math.ceil(filledSegments / 2) || index >= safeSegments - Math.floor(filledSegments / 2);
          const segmentProgress = (index + 1) / safeSegments;

          return (
            <span
              key={index}
              className={`rpm-bar__segment${isFilled ? " rpm-bar__segment--filled" : ""}`}
              style={{
                backgroundColor: isFilled ? colorForProgress(segmentProgress, zones) : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
