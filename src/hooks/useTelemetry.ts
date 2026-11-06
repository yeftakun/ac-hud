import { useCallback, useEffect, useState } from "react";

export type TelemetryValue = number | boolean | string | null;
export type Telemetry = Record<string, TelemetryValue>;

export interface UseTelemetryResult {
  telemetry: Telemetry;
  isLoading: boolean;
  error: Error | null;
  getValue: (dataKey: string) => TelemetryValue | undefined;
}

function isTelemetryObject(value: unknown): value is Telemetry {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * MVP1 telemetry provider.
 *
 * This is intentionally the only place that reads capture.json. The payload
 * uses flat dot-notation keys, so lookup must stay a direct object access:
 * telemetry[dataKey].
 */
export function useTelemetry(): UseTelemetryResult {
  const [telemetry, setTelemetry] = useState<Telemetry>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTelemetry() {
      try {
        const response = await fetch("/capture.json", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load telemetry (${response.status})`);
        }

        const payload: unknown = await response.json();
        if (!isTelemetryObject(payload)) {
          throw new Error("Telemetry payload must be a flat object");
        }

        setTelemetry(payload);
        setError(null);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError
            : new Error("Failed to load telemetry"),
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadTelemetry();

    return () => controller.abort();
  }, []);

  const getValue = useCallback(
    (dataKey: string) => telemetry[dataKey],
    [telemetry],
  );

  return { telemetry, isLoading, error, getValue };
}
