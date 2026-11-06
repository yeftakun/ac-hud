import type { CSSProperties } from "react";
import type { StatBoxStyle } from "./StatBox";
import "./hud-widgets.css";

export type Corner = "FL" | "FR" | "RL" | "RR";

export interface TyreReading {
  psi?: number | null;
  temp?: number | null;
}

// Mirrors "tempThresholds" in the tyres widget payload (PLAN.md §5.3).
export interface TyreThresholds {
  cold: number;
  optimal: number;
  hot: number;
}

export interface TyresWidgetProps {
  data: Record<Corner, TyreReading>;
  thresholds?: TyreThresholds;
  style?: StatBoxStyle;
  className?: string;
}

const DEFAULT_THRESHOLDS: TyreThresholds = { cold: 70, optimal: 95, hot: 110 };

const DEFAULT_STYLE: Required<StatBoxStyle> = {
  boxBg: "#141820",
  boxBorder: "#2a3340",
  labelColor: "#a8b2c0",
  valueColor: "#ffffff",
};

// Below cold = biru, cold–optimal = hijau, optimal–hot = kuning, di atas hot = merah.
function tyreColor(temp: number, t: TyreThresholds): string {
  if (temp < t.cold) return "#2563eb";
  if (temp < t.optimal) return "#16a34a";
  if (temp < t.hot) return "#eab308";
  return "#dc2626";
}

const CORNER_ORDER: Corner[] = ["FL", "FR", "RL", "RR"];

export function TyresWidget({
  data,
  thresholds = DEFAULT_THRESHOLDS,
  style,
  className,
}: TyresWidgetProps) {
  const merged = { ...DEFAULT_STYLE, ...style };
  const cssVars = {
    "--box-bg": merged.boxBg,
    "--box-border": merged.boxBorder,
    "--label-color": merged.labelColor,
    "--value-color": merged.valueColor,
  } as CSSProperties;

  return (
    <div className={`tyres-widget ${className ?? ""}`} style={cssVars}>
      <span className="hud-box__label">TYRES</span>
      <div className="tyres-widget__grid">
        {CORNER_ORDER.map((corner) => {
          const reading = data[corner] ?? {};
          const hasData = reading.psi != null && reading.temp != null;
          const bg = hasData ? tyreColor(reading.temp as number, thresholds) : undefined;

          return (
            <div
              key={corner}
              className="tyres-widget__cell"
              style={bg ? { backgroundColor: bg } : undefined}
            >
              <div className="tyres-widget__psi">
                {hasData ? (reading.psi as number).toFixed(1) : "NA"}
              </div>
              <div className="tyres-widget__temp">
                {hasData ? `${Math.round(reading.temp as number)}°C` : "NA°C"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
