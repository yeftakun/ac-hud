import type { CSSProperties } from "react";
import type { StatBoxStyle, WidgetMode } from "./StatBox";
import "./hud-widgets.css";

export interface DrsProps {
  available?: boolean | null;
  enabled?: boolean | null;
  active?: boolean | null;
  activeColor?: string;
  availableColor?: string;
  inactiveColor?: string;
  label?: string;
  style?: StatBoxStyle;
  className?: string;
  mode?: WidgetMode;
}

export function Drs({
  available = false,
  enabled = false,
  active,
  activeColor = "#2ee66b",
  availableColor = "#ffd400",
  inactiveColor = "#2a3340",
  label = "DRS",
  style,
  className,
  mode = "display",
}: DrsProps) {
  const isGreen = Boolean(enabled || active);
  const backgroundColor = isGreen ? activeColor : available ? availableColor : inactiveColor;
  const cssVars = {
    "--box-bg": backgroundColor,
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
