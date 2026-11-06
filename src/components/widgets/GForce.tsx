import type { CSSProperties } from "react";
import type { StatBoxStyle, WidgetMode } from "./StatBox";
import "./hud-widgets.css";

export interface GForceProps {
  x?: number | null;
  y?: number | null;
  maxG?: number;
  style?: StatBoxStyle;
  className?: string;
  mode?: WidgetMode;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function GForce({ x, y, maxG = 2, style, className, mode = "display" }: GForceProps) {
  const xValue = typeof x === "number" && Number.isFinite(x) ? x : null;
  const yValue = typeof y === "number" && Number.isFinite(y) ? y : null;
  const left = 50 + (xValue === null ? 0 : clamp(xValue / maxG, -1, 1) * 42);
  // Show longitudinal acceleration from the driver's inertial perspective:
  // accelerating forward moves the dot toward the rear/bottom of the circle.
  const top = 50 + (yValue === null ? 0 : clamp(yValue / maxG, -1, 1) * 42);
  const cssVars = {
    "--box-bg": style?.boxBg ?? "#141820",
    "--box-border": style?.boxBorder ?? "#2a3340",
    "--label-color": style?.labelColor ?? "#a8b2c0",
    "--value-color": style?.valueColor ?? "#ffffff",
    "--g-dot-left": `${left}%`,
    "--g-dot-top": `${top}%`,
  } as CSSProperties;

  return (
    <div className={`gforce-widget ${className ?? ""}`} style={cssVars} data-mode={mode}>
      <span className="gforce-widget__label">G-FORCE</span>
      <div className="gforce-widget__circle"><span className="gforce-widget__dot" /></div>
      <div className="gforce-widget__values"><span>X {xValue === null ? "NA" : xValue.toFixed(2)}</span><span>Y {yValue === null ? "NA" : yValue.toFixed(2)}</span></div>
    </div>
  );
}
