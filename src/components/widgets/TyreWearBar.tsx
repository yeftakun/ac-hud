import type { CSSProperties } from "react";
import type { StatBoxStyle, WidgetMode } from "./StatBox";
import "./hud-widgets.css";

export interface TyreWearBarProps {
  value?: number | null;
  label?: string;
  style?: StatBoxStyle;
  className?: string;
  mode?: WidgetMode;
}

export function TyreWearBar({ value, label = "FL WEAR", style, className, mode = "display" }: TyreWearBarProps) {
  const numericValue = typeof value === "number" && Number.isFinite(value) ? value : null;
  const progress = numericValue === null ? 0 : Math.min(100, Math.max(0, numericValue));
  const cssVars = {
    "--box-bg": style?.boxBg ?? "#141820",
    "--box-border": style?.boxBorder ?? "#2a3340",
    "--label-color": style?.labelColor ?? "#a8b2c0",
    "--value-color": style?.valueColor ?? "#ffffff",
    "--meter-color": "#ffd400",
    "--meter-progress": `${progress}%`,
  } as CSSProperties;

  return (
    <div className={`meter-widget tyre-wear-bar ${className ?? ""}`} style={cssVars} data-mode={mode}>
      <div className="meter-widget__header"><span>{label}</span><strong>{numericValue === null ? "NA" : `${numericValue.toFixed(1)}%`}</strong></div>
      <div className="meter-widget__track"><span className="meter-widget__fill" style={{ width: `${progress}%` }} /></div>
    </div>
  );
}
