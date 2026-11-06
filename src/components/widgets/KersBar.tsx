import type { CSSProperties } from "react";
import type { StatBoxStyle, WidgetMode } from "./StatBox";
import "./hud-widgets.css";

export interface KersBarProps {
  charge?: number | null;
  input?: number | null;
  style?: StatBoxStyle;
  className?: string;
  mode?: WidgetMode;
}

function progress(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function KersBar({ charge, input, style, className, mode = "display" }: KersBarProps) {
  const cssVars = {
    "--box-bg": style?.boxBg ?? "#141820",
    "--box-border": style?.boxBorder ?? "#2a3340",
    "--label-color": style?.labelColor ?? "#a8b2c0",
    "--value-color": style?.valueColor ?? "#ffffff",
    "--meter-color": "#4f9cff",
    "--meter-progress": `${progress(charge)}%`,
    "--kers-input": `${progress(input)}%`,
  } as CSSProperties;

  return (
    <div className={`meter-widget kers-bar ${className ?? ""}`} style={cssVars} data-mode={mode}>
      <div className="meter-widget__header"><span>KERS</span><strong>{typeof charge === "number" ? `${charge.toFixed(0)}%` : "NA"}</strong></div>
      <div className="meter-widget__track"><span className="meter-widget__fill" style={{ width: `${progress(charge)}%` }} /><span className="kers-bar__input" /></div>
      <small className="kers-bar__caption">INPUT {typeof input === "number" ? `${input.toFixed(0)}%` : "NA"}</small>
    </div>
  );
}
