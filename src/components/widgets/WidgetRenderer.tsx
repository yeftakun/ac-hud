import type { CSSProperties } from "react";
import { useTelemetry } from "../../hooks/useTelemetry";
import { ActivationLights, type ActivationState } from "./ActivationLights";
import { Drs } from "./Drs";
import { GForce } from "./GForce";
import { KersBar } from "./KersBar";
import { OverlayEvent } from "./OverlayEvent";
import { PedalBar } from "./PedalBar";
import { RawValue } from "./RawValue";
import { RpmBar, type RpmZone } from "./RpmBar";
import { StatBox, type StatBoxStyle, type StatBoxValueFormat, type WidgetMode } from "./StatBox";
import { StatGroup, type StatGroupRow } from "./StatGroup";
import { TyresWidget, type Corner, type TyreReading, type TyreThresholds } from "./TyresWidget";
import { SteeringWheel } from "./SteeringWheel";
import { TyreWearBar } from "./TyreWearBar";
import "./hud-widgets.css";

export type WidgetValue = string | number | boolean | null;

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
  mode?: WidgetMode;
}

function valueFor(
  payload: Record<string, unknown>,
  getValue: ReturnType<typeof useTelemetry>["getValue"],
): WidgetValue | undefined {
  const dataKey = payload.dataKey;
  return typeof dataKey === "string" ? getValue(dataKey) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function WidgetRenderer({ widget, mode = "display" }: WidgetRendererProps) {
  const { getValue } = useTelemetry();
  const payload = widget.payload ?? {};
  const value = valueFor(payload, getValue);

  switch (widget.type) {
    case "stat-box":
      return (
        <StatBox
          label={typeof payload.label === "string" ? payload.label : widget.id}
          value={typeof value === "boolean" ? String(value) : value}
          unit={typeof payload.unit === "string" ? payload.unit : null}
          decimals={typeof payload.decimals === "number" ? payload.decimals : undefined}
          format={payload.format === "laptime" ? ("laptime" satisfies StatBoxValueFormat) : "decimal"}
          fontSize={typeof payload.fontSize === "number" ? payload.fontSize : undefined}
          style={widget.style}
          mode={mode}
        />
      );

    case "stat-group": {
      const rows = Array.isArray(payload.rows) ? payload.rows : [];
      const resolvedRows: StatGroupRow[] = rows.flatMap((row) => {
        if (typeof row !== "object" || row === null || Array.isArray(row)) return [];
        const config = row as Record<string, unknown>;
        if (typeof config.label !== "string" || typeof config.dataKey !== "string") return [];
        const rowValue = getValue(config.dataKey);
        return [
          {
            label: config.label,
            value: typeof rowValue === "boolean" ? String(rowValue) : rowValue,
            unit: typeof config.unit === "string" ? config.unit : null,
            decimals: typeof config.decimals === "number" ? config.decimals : undefined,
          },
        ];
      });

      return (
        <StatGroup
          rows={resolvedRows}
          style={widget.style}
          fontSize={typeof payload.fontSize === "number" ? payload.fontSize : undefined}
          mode={mode}
        />
      );
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
          mode={mode}
        />
      );

    case "pedal-bar":
      return (
        <PedalBar
          value={typeof value === "number" ? value : undefined}
          label={typeof payload.label === "string" ? payload.label : widget.id}
          color={typeof payload.color === "string" ? payload.color : undefined}
          max={typeof payload.max === "number" ? payload.max : undefined}
          style={widget.style}
          mode={mode}
        />
      );

    case "steering-wheel":
      return (
        <SteeringWheel
          value={typeof value === "number" ? value : undefined}
          maxInput={typeof payload.maxInput === "number" ? payload.maxInput : undefined}
          style={widget.style}
          mode={mode}
        />
      );

    case "kers-bar": {
      const inputKey = typeof payload.inputDataKey === "string" ? payload.inputDataKey : "kers.input";
      const input = getValue(inputKey);
      return <KersBar charge={typeof value === "number" ? value : undefined} input={typeof input === "number" ? input : undefined} style={widget.style} mode={mode} />;
    }

    case "tyre-wear-bar":
      return (
        <TyreWearBar
          value={typeof value === "number" ? value : undefined}
          label={typeof payload.label === "string" ? payload.label : "FL WEAR"}
          style={widget.style}
          mode={mode}
        />
      );

    case "gforce": {
      const xKey = typeof payload.xDataKey === "string" ? payload.xDataKey : "gforce.x";
      const yKey = typeof payload.yDataKey === "string" ? payload.yDataKey : "gforce.y";
      const x = getValue(xKey);
      const y = getValue(yKey);
      return <GForce x={typeof x === "number" ? x : undefined} y={typeof y === "number" ? y : undefined} maxG={typeof payload.maxG === "number" ? payload.maxG : undefined} style={widget.style} mode={mode} />;
    }

    case "drs":
      return (
        <Drs
          active={Boolean(value)}
          activeColor={typeof payload.activeColor === "string" ? payload.activeColor : undefined}
          inactiveColor={typeof payload.inactiveColor === "string" ? payload.inactiveColor : undefined}
          label={typeof payload.label === "string" ? payload.label : undefined}
          style={widget.style}
          mode={mode}
        />
      );

    case "rpm-bar": {
      const configuredZones: RpmZone[] = Array.isArray(payload.zones)
        ? payload.zones.flatMap((zone) => {
            if (!isRecord(zone) || typeof zone.color !== "string" || typeof zone.upTo !== "number") return [];
            return [{ upTo: zone.upTo, color: zone.color }];
          })
        : [];
      const redlineValue =
        typeof payload.redline === "number"
          ? payload.redline
          : typeof payload.redlineDataKey === "string"
            ? getValue(payload.redlineDataKey)
            : getValue("redline");

      return (
        <RpmBar
          rpm={typeof value === "number" ? value : undefined}
          redline={typeof redlineValue === "number" ? redlineValue : undefined}
          segments={typeof payload.segments === "number" ? payload.segments : undefined}
          zones={configuredZones.length > 0 ? configuredZones : undefined}
          fillDirection={payload.fillDirection === "left-to-right" ? "left-to-right" : "edge-to-center"}
          style={widget.style}
          mode={mode}
        />
      );
    }

    case "activation-lights": {
      const configuredStates: Record<string, ActivationState> = {};
      if (isRecord(payload.states)) {
        for (const [stateName, stateValue] of Object.entries(payload.states)) {
          if (!isRecord(stateValue) || typeof stateValue.color !== "string") continue;
          configuredStates[stateName] = {
            color: stateValue.color,
            blink: stateValue.blink === true,
            blinkMs: typeof stateValue.blinkMs === "number" ? stateValue.blinkMs : undefined,
            dataKey: typeof stateValue.dataKey === "string" ? stateValue.dataKey : undefined,
          };
        }
      }

      const activeStates: Record<string, boolean> = {};
      for (const [stateName, stateConfig] of Object.entries(configuredStates)) {
        const dataKey = stateConfig.dataKey ?? (stateName === "pit" ? "pit.active" : stateName);
        activeStates[stateName] = Boolean(getValue(dataKey));
      }

      const priority = Array.isArray(payload.priority)
        ? payload.priority.filter((stateName): stateName is string => typeof stateName === "string")
        : [];

      return (
        <ActivationLights
          lampCount={typeof payload.lampCount === "number" ? payload.lampCount : undefined}
          priority={priority}
          states={configuredStates}
          activeStates={activeStates}
          style={widget.style}
          mode={mode}
        />
      );
    }

    case "tyres": {
      const corners: Corner[] = ["FL", "FR", "RL", "RR"];
      const data = Object.fromEntries(
        corners.map((corner) => {
          const cornerConfig = isRecord(payload.dataKeys) && isRecord(payload.dataKeys[corner])
            ? payload.dataKeys[corner]
            : {};
          const psiKey = cornerConfig.psi;
          const tempKey = cornerConfig.temp;
          const psi = typeof psiKey === "string" ? getValue(psiKey) : undefined;
          const temp = typeof tempKey === "string" ? getValue(tempKey) : undefined;
          const reading: TyreReading = {
            psi: typeof psi === "number" ? psi : undefined,
            temp: typeof temp === "number" ? temp : undefined,
          };
          return [corner, reading];
        }),
      ) as Record<Corner, TyreReading>;

      const thresholdConfig = isRecord(payload.tempThresholds) ? payload.tempThresholds : undefined;
      const thresholds: TyreThresholds | undefined =
        thresholdConfig &&
        typeof thresholdConfig.cold === "number" &&
        typeof thresholdConfig.optimal === "number" &&
        typeof thresholdConfig.hot === "number"
          ? {
              cold: thresholdConfig.cold,
              optimal: thresholdConfig.optimal,
              hot: thresholdConfig.hot,
            }
          : undefined;

      return <TyresWidget data={data} thresholds={thresholds} style={widget.style} mode={mode} />;
    }

    case "overlay-event":
      return (
        <OverlayEvent
          triggerKey={typeof payload.triggerKey === "string" ? payload.triggerKey : ""}
          triggerWhen={payload.triggerWhen}
          label={typeof payload.label === "string" ? payload.label : widget.id}
          coverage={payload.coverage === "full" ? "full" : "partial"}
          x={widget.x}
          y={widget.y}
          w={widget.w}
          h={widget.h}
          zIndex={widget.zIndex ?? 100}
          persistWhileActive={payload.persistWhileActive !== false}
          autoDismissMs={typeof payload.autoDismissMs === "number" ? payload.autoDismissMs : null}
          transitionMs={typeof payload.transitionMs === "number" ? payload.transitionMs : undefined}
          style={widget.style}
          mode={mode}
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
