import type { CSSProperties } from "react";
import type { StatBoxStyle } from "./StatBox";
import "./hud-widgets.css";

export interface RawValueProps {
  value?: string | number | null;
  showSign?: boolean;
  decimals?: number;
  suffix?: string | null;
  fontSize?: number;
  style?: StatBoxStyle;
  className?: string;
}

function formatValue(
  value: RawValueProps["value"],
  decimals?: number,
  showSign = false,
): string {
  if (value === null || value === undefined || value === "") return "NA";

  const displayValue =
    typeof value === "number" && typeof decimals === "number"
      ? value.toFixed(decimals)
      : String(value);

  if (showSign && !displayValue.startsWith("+") && !displayValue.startsWith("-")) {
    return `+${displayValue}`;
  }

  return displayValue;
}

export function RawValue({
  value,
  showSign = false,
  decimals,
  suffix,
  fontSize = 48,
  style,
  className,
}: RawValueProps) {
  const cssVars = {
    "--value-color": style?.valueColor ?? "#ffffff",
    "--raw-font-size": `${fontSize}px`,
  } as CSSProperties;
  const displayValue = formatValue(value, decimals, showSign);

  return (
    <div className={`raw-value ${className ?? ""}`} style={cssVars}>
      <span>{displayValue}</span>
      {displayValue !== "NA" && suffix ? <span className="raw-value__suffix">{suffix}</span> : null}
    </div>
  );
}
