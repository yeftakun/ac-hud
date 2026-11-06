import type { CSSProperties } from "react";
import type { StatBoxStyle, WidgetMode } from "./StatBox";
import "./hud-widgets.css";

export interface SteeringWheelProps {
  value?: number | null;
  maxInput?: number;
  style?: StatBoxStyle;
  className?: string;
  mode?: WidgetMode;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function SteeringWheel({ value, maxInput = 1, style, className, mode = "display" }: SteeringWheelProps) {
  const numericValue = typeof value === "number" && Number.isFinite(value) ? value : null;
  const normalized = numericValue === null ? 0 : clamp(numericValue / maxInput, -1, 1);
  const rotation = normalized * 135;
  const cssVars = {
    "--box-bg": style?.boxBg ?? "#141820",
    "--box-border": style?.boxBorder ?? "#2a3340",
    "--label-color": style?.labelColor ?? "#a8b2c0",
    "--value-color": style?.valueColor ?? "#ffffff",
    "--steering-rotation": `${rotation}deg`,
  } as CSSProperties;

  return (
    <div className={`steering-wheel ${className ?? ""}`} style={cssVars} data-mode={mode}>
      <span className="steering-wheel__label">STEERING</span>
      <div className="steering-wheel__dial">
        <span className="steering-wheel__crosshair steering-wheel__crosshair--horizontal" />
        <span className="steering-wheel__crosshair steering-wheel__crosshair--vertical" />
        <span className="steering-wheel__spoke steering-wheel__spoke--left" />
        <span className="steering-wheel__spoke steering-wheel__spoke--right" />
        <span className="steering-wheel__hub" />
        <span className="steering-wheel__indicator" />
      </div>
      <strong className="steering-wheel__value">{numericValue === null ? "NA" : numericValue.toFixed(2)}</strong>
    </div>
  );
}
