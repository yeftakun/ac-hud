import type { CSSProperties } from "react";
import "./hud-widgets.css";

// Mirrors the "style" object in the widget config schema (PLAN.md §5.3).
export interface StatBoxStyle {
  boxBg?: string;
  boxBorder?: string;
  labelColor?: string;
  valueColor?: string;
}

export type WidgetMode = "edit" | "display";
export type StatBoxValueFormat = "decimal" | "laptime";

export interface StatBoxProps {
  label: string;
  /** Resolved value for this widget's dataKey. Pass null/undefined for the
   * "not bound yet / no data" placeholder state shown in the reference image. */
  value?: string | number | null;
  unit?: string | null;
  decimals?: number;
  format?: StatBoxValueFormat;
  style?: StatBoxStyle;
  className?: string;
  mode?: WidgetMode;
}

const DEFAULT_STYLE: Required<StatBoxStyle> = {
  boxBg: "#141820",
  boxBorder: "#2a3340",
  labelColor: "#a8b2c0",
  valueColor: "#ffffff",
};

function formatValue(value: StatBoxProps["value"], decimals?: number, format: StatBoxValueFormat = "decimal"): string {
  if (value === null || value === undefined || value === "") return "NA";
  if (format === "laptime" && typeof value === "number" && Number.isFinite(value)) {
    const minutes = Math.floor(value / 60);
    const seconds = (value - minutes * 60).toFixed(3).padStart(6, "0");
    return `${minutes}:${seconds}`;
  }
  if (typeof value === "number" && typeof decimals === "number") {
    return value.toFixed(decimals);
  }
  return String(value);
}

export function StatBox({
  label,
  value,
  unit,
  decimals,
  format = "decimal",
  style,
  className,
  mode = "display",
}: StatBoxProps) {
  const merged = { ...DEFAULT_STYLE, ...style };
  const cssVars = {
    "--box-bg": merged.boxBg,
    "--box-border": merged.boxBorder,
    "--label-color": merged.labelColor,
    "--value-color": merged.valueColor,
  } as CSSProperties;

  const displayValue = formatValue(value, decimals, format);
  const showUnit = displayValue !== "NA" && unit;

  return (
    <div className={`hud-box ${className ?? ""}`} style={cssVars} data-mode={mode}>
      <span className="hud-box__label">{label}</span>
      <div className="statbox__value">
        <span>{displayValue}</span>
        {showUnit ? <span className="statbox__unit">{unit}</span> : null}
      </div>
    </div>
  );
}
