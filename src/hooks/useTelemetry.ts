import { useCallback, useEffect } from "react";
import { useTelemetryStore } from "../lib/telemetryStore";
import type { Telemetry, TelemetrySource, TelemetryValue } from "../lib/telemetryStore";

export type { Telemetry, TelemetrySource, TelemetryValue } from "../lib/telemetryStore";

export interface UseTelemetryResult {
  telemetry: Telemetry;
  isLoading: boolean;
  error: Error | null;
  source: TelemetrySource;
  getValue: (dataKey: string) => TelemetryValue | undefined;
  setValue: (dataKey: string, value: TelemetryValue) => void;
  setValues: (values: Partial<Telemetry>) => void;
  reset: () => void;
  setSource: (source: TelemetrySource) => void;
}

export function useTelemetry(): UseTelemetryResult {
  const telemetry = useTelemetryStore((state) => state.telemetry);
  const isLoading = useTelemetryStore((state) => state.isLoading);
  const error = useTelemetryStore((state) => state.error);
  const source = useTelemetryStore((state) => state.source);
  const initialize = useTelemetryStore((state) => state.initialize);
  const setValue = useTelemetryStore((state) => state.setValue);
  const setValues = useTelemetryStore((state) => state.setValues);
  const reset = useTelemetryStore((state) => state.reset);
  const setSource = useTelemetryStore((state) => state.setSource);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const getValue = useCallback((dataKey: string) => telemetry[dataKey], [telemetry]);
  return { telemetry, isLoading, error, source, getValue, setValue, setValues, reset, setSource };
}
