import type { CSSProperties } from "react";
import type { StatBoxStyle } from "./StatBox";
import "./hud-widgets.css";

export interface DrsProps {
  active?: boolean | null;
  activeColor?: string;
  inactiveColor?: string;
  label?: string;
  style?: StatBoxStyle;
  className?: string;
}

export function Drs({
  active,
  activeColor = "#2ee66b",
  inactiveColor = "#2a3340",
  label = "DRS",
  style,
  className,
}: DrsProps) {
  const cssVars = {
    "--box-bg": active ? activeColor : inactiveColor,
    "--box-border": style?.boxBorder ?? "#2a3340",
    "--label-color": style?.labelColor ?? "#a8b2c0",
    "--value-color": style?.valueColor ?? "#ffffff",
  } as CSSProperties;

  return (
    <div className={`hud-box drs-widget ${className ?? ""}`} style={cssVars}>
      <span className="drs-widget__label">{label}</span>
    </div>
  );
}
