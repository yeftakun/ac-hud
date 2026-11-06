import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useTelemetry } from "../../hooks/useTelemetry";
import type { StatBoxStyle, WidgetMode } from "./StatBox";
import "./hud-widgets.css";

export type OverlayCoverage = "full" | "partial";

export interface OverlayEventProps {
  triggerKey: string;
  triggerWhen: unknown;
  label: string;
  coverage?: OverlayCoverage;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  zIndex?: number;
  persistWhileActive?: boolean;
  autoDismissMs?: number | null;
  transitionMs?: number;
  style?: StatBoxStyle;
  mode?: WidgetMode;
  className?: string;
}

export function OverlayEvent({
  triggerKey,
  triggerWhen,
  label,
  coverage = "partial",
  x = 0,
  y = 0,
  w = 960,
  h = 540,
  zIndex = 100,
  persistWhileActive = true,
  autoDismissMs = null,
  transitionMs = 250,
  style,
  mode = "display",
  className,
}: OverlayEventProps) {
  const { getValue } = useTelemetry();
  const triggerValue = getValue(triggerKey);
  const triggerIsActive = triggerKey.length > 0 && triggerValue === triggerWhen;
  const wasActive = useRef(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [forcedHidden, setForcedHidden] = useState(false);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);

    if (!triggerIsActive) {
      wasActive.current = false;
      setForcedHidden(false);
      return;
    }

    const becameActive = !wasActive.current;
    wasActive.current = true;
    setForcedHidden(false);

    if (!persistWhileActive && becameActive && autoDismissMs != null) {
      dismissTimer.current = setTimeout(() => setForcedHidden(true), Math.max(0, autoDismissMs));
    }

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [autoDismissMs, persistWhileActive, triggerIsActive]);

  useEffect(() => {
    if (!triggerIsActive || forcedHidden) return;
    setOpacity(0);
    const frame = requestAnimationFrame(() => setOpacity(1));
    return () => cancelAnimationFrame(frame);
  }, [forcedHidden, triggerIsActive]);

  if (!triggerIsActive || forcedHidden) return null;

  const cssVars = {
    "--overlay-bg": style?.boxBg ?? "rgba(0, 0, 0, 0.85)",
    "--overlay-border": style?.boxBorder ?? "#ffd400",
    "--overlay-label": style?.labelColor ?? "#ffd400",
    "--overlay-value": style?.valueColor ?? "#ffd400",
    "--overlay-transition-ms": `${Math.max(0, transitionMs)}ms`,
  } as CSSProperties;

  return (
    <div
      className={`overlay-event overlay-event--${coverage} ${className ?? ""}`}
      data-mode={mode}
      style={{
        ...cssVars,
        left: coverage === "partial" ? x : undefined,
        top: coverage === "partial" ? y : undefined,
        width: coverage === "partial" ? w : undefined,
        height: coverage === "partial" ? h : undefined,
        zIndex,
        opacity,
      }}
      role="status"
      aria-live="polite"
    >
      <span>{label}</span>
    </div>
  );
}
