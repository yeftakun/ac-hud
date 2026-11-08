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
  // AC's steering input represents the complete steering range. A 180 degree
  // marker sweep makes left/right input visibly match the in-game wheel.
  const rotation = normalized * 180;
  const cssVars = {
    "--box-bg": style?.boxBg ?? "#141820",
    "--box-border": style?.boxBorder ?? "#2a3340",
    "--label-color": style?.labelColor ?? "#a8b2c0",
    "--value-color": style?.valueColor ?? "#ffffff",
    "--steering-rotation": `${rotation}deg`,
  } as CSSProperties;

  return (
    <div className={`steering-wheel ${className ?? ""}`} style={cssVars} data-mode={mode}>
      <div className="steering-wheel__dial">
        <span className="steering-wheel__indicator" />
      </div>
    </div>
  );
}
