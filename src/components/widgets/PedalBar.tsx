import type { CSSProperties } from "react";
import type { StatBoxStyle, WidgetMode } from "./StatBox";
import "./hud-widgets.css";

export interface PedalBarProps {
  value?: number | null;
  label: string;
  color?: string;
  max?: number;
  style?: StatBoxStyle;
  className?: string;
  mode?: WidgetMode;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function PedalBar({
  value,
  label,
  color = "#2ee66b",
  max = 100,
  style,
  className,
  mode = "display",
}: PedalBarProps) {
  const numericValue = typeof value === "number" && Number.isFinite(value) ? value : null;
  const progress = numericValue === null ? 0 : clamp(numericValue / max, 0, 1) * 100;
  const cssVars = {
    "--box-bg": style?.boxBg ?? "#141820",
    "--box-border": style?.boxBorder ?? "#2a3340",
    "--label-color": style?.labelColor ?? "#a8b2c0",
    "--value-color": style?.valueColor ?? "#ffffff",
    "--meter-color": color,
    "--meter-progress": `${progress}%`,
  } as CSSProperties;

  return (
    <div className={`meter-widget pedal-bar ${className ?? ""}`} style={cssVars} data-mode={mode}>
      <div className="meter-widget__header"><span>{label}</span><strong>{numericValue === null ? "NA" : `${numericValue.toFixed(0)}%`}</strong></div>
      <div className="meter-widget__track"><span className="meter-widget__fill" style={{ width: `${progress}%` }} /></div>
    </div>
  );
}
