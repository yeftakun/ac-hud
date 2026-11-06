import type { CSSProperties } from "react";
import type { StatBoxStyle } from "./StatBox";
import "./hud-widgets.css";

export interface ActivationState {
  color: string;
  blink?: boolean;
  blinkMs?: number;
  dataKey?: string;
}

export interface ActivationLightsProps {
  lampCount?: number;
  priority?: string[];
  states: Record<string, ActivationState>;
  activeStates: Record<string, boolean>;
  style?: StatBoxStyle;
  className?: string;
}

export function ActivationLights({
  lampCount = 4,
  priority = [],
  states,
  activeStates,
  style,
  className,
}: ActivationLightsProps) {
  const activeState = priority.find((stateName) => activeStates[stateName]);
  const selectedState = activeState ? states[activeState] : undefined;
  const safeLampCount = Math.max(1, Math.floor(lampCount));
  const cssVars = {
    "--box-bg": style?.boxBg ?? "#141820",
    "--box-border": style?.boxBorder ?? "#2a3340",
    "--lamp-color": selectedState?.color ?? style?.boxBorder ?? "#2a3340",
    "--blink-ms": `${selectedState?.blinkMs ?? 400}ms`,
  } as CSSProperties;

  return (
    <div className={`activation-lights ${className ?? ""}`} style={cssVars}>
      {Array.from({ length: safeLampCount }, (_, index) => (
        <span
          key={index}
          className={`activation-lights__lamp${selectedState ? " activation-lights__lamp--active" : ""}${selectedState?.blink ? " activation-lights__lamp--blink" : ""}`}
        />
      ))}
    </div>
  );
}
