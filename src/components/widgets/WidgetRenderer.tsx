import type { CSSProperties } from "react";
import { RawValue } from "./RawValue";
import { StatBox, type StatBoxStyle } from "./StatBox";
import { StatGroup, type StatGroupRow } from "./StatGroup";
import "./hud-widgets.css";

export type WidgetValue = string | number | boolean | null;
export type WidgetValues = Record<string, WidgetValue>;

export interface WidgetConfig {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex?: number;
  style?: StatBoxStyle;
  payload?: Record<string, unknown>;
}

interface WidgetRendererProps {
  widget: WidgetConfig;
  values?: WidgetValues;
}

function valueFor(payload: Record<string, unknown>, values?: WidgetValues): WidgetValue | undefined {
  const dataKey = payload.dataKey;
  return typeof dataKey === "string" ? values?.[dataKey] : undefined;
}

export function WidgetRenderer({ widget, values }: WidgetRendererProps) {
  const payload = widget.payload ?? {};
  const value = valueFor(payload, values);

  switch (widget.type) {
    case "stat-box":
      return (
        <StatBox
          label={typeof payload.label === "string" ? payload.label : widget.id}
          value={typeof value === "boolean" ? String(value) : value}
          unit={typeof payload.unit === "string" ? payload.unit : null}
          decimals={typeof payload.decimals === "number" ? payload.decimals : undefined}
          style={widget.style}
        />
      );

    case "stat-group": {
      const rows = Array.isArray(payload.rows) ? payload.rows : [];
      const resolvedRows: StatGroupRow[] = rows.flatMap((row) => {
        if (typeof row !== "object" || row === null || Array.isArray(row)) return [];
        const config = row as Record<string, unknown>;
        if (typeof config.label !== "string" || typeof config.dataKey !== "string") return [];
        const rowValue = values?.[config.dataKey];
        return [
          {
            label: config.label,
            value: typeof rowValue === "boolean" ? String(rowValue) : rowValue,
            unit: typeof config.unit === "string" ? config.unit : null,
            decimals: typeof config.decimals === "number" ? config.decimals : undefined,
          },
        ];
      });

      return <StatGroup rows={resolvedRows} style={widget.style} />;
    }

    case "raw-value":
      return (
        <RawValue
          value={typeof value === "boolean" ? String(value) : value}
          showSign={payload.showSign === true}
          decimals={typeof payload.decimals === "number" ? payload.decimals : undefined}
          suffix={typeof payload.suffix === "string" ? payload.suffix : null}
          fontSize={typeof payload.fontSize === "number" ? payload.fontSize : undefined}
          style={widget.style}
        />
      );

    default:
      return (
        <div className="widget-placeholder" style={{ "--placeholder-type": `"${widget.type}"` } as CSSProperties}>
          Unsupported widget: {widget.type}
        </div>
      );
  }
}
