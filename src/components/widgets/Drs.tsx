import type { CSSProperties } from "react";
import type { StatBoxStyle, WidgetMode } from "./StatBox";
import "./hud-widgets.css";

export interface DrsProps {
  active?: boolean | null;
  activeColor?: string;
  inactiveColor?: string;
  label?: string;
  style?: StatBoxStyle;
  className?: string;
  mode?: WidgetMode;
}

export function Drs({
  active,
  activeColor = "#2ee66b",
  inactiveColor = "#2a3340",
  label = "DRS",
  style,
  className,
  mode = "display",
}: DrsProps) {
  const cssVars = {
    "--box-bg": active ? activeColor : inactiveColor,
    "--box-border": style?.boxBorder ?? "#2a3340",
    "--label-color": style?.labelColor ?? "#a8b2c0",
    "--value-color": style?.valueColor ?? "#ffffff",
  } as CSSProperties;

  return (
    <div className={`hud-box drs-widget ${className ?? ""}`} style={cssVars} data-mode={mode}>
      <span className="drs-widget__label">{label}</span>
    </div>
  );
}
