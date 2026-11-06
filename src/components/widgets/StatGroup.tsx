import type { CSSProperties } from "react";
import type { StatBoxStyle } from "./StatBox";
import "./hud-widgets.css";

export interface StatGroupRow {
  label: string;
  value?: string | number | null;
  unit?: string | null;
  decimals?: number;
}

export interface StatGroupProps {
  rows: StatGroupRow[];
  style?: StatBoxStyle;
  className?: string;
}

const DEFAULT_STYLE: Required<StatBoxStyle> = {
  boxBg: "#141820",
  boxBorder: "#2a3340",
  labelColor: "#a8b2c0",
  valueColor: "#ffffff",
};

function formatValue(value: StatGroupRow["value"], decimals?: number): string {
  if (value === null || value === undefined || value === "") return "NA";
  if (typeof value === "number" && typeof decimals === "number") {
    return value.toFixed(decimals);
  }
  return String(value);
}

export function StatGroup({ rows, style, className }: StatGroupProps) {
  const merged = { ...DEFAULT_STYLE, ...style };
  const cssVars = {
    "--box-bg": merged.boxBg,
    "--box-border": merged.boxBorder,
    "--label-color": merged.labelColor,
    "--value-color": merged.valueColor,
  } as CSSProperties;

  return (
    <div className={`hud-box stat-group ${className ?? ""}`} style={cssVars}>
      <div className="stat-group__rows">
        {rows.map((row) => {
          const displayValue = formatValue(row.value, row.decimals);
          const showUnit = displayValue !== "NA" && row.unit;

          return (
            <div className="stat-group__row" key={row.label}>
              <span className="stat-group__label">{row.label}</span>
              <span className="stat-group__value">
                {displayValue}
                {showUnit ? <span className="stat-group__unit">{row.unit}</span> : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
