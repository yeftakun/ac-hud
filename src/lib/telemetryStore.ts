import { create } from "zustand";
import { CONFIG_API_URL } from "./configApi";

export type TelemetryValue = number | boolean | string | null;
export type Telemetry = Record<string, TelemetryValue>;
export type TelemetrySource = "live-test" | "assetto-corsa" | "acc";

interface TelemetryStore {
  telemetry: Telemetry;
  baseline: Telemetry;
  source: TelemetrySource;
  isLoading: boolean;
  error: Error | null;
  initialized: boolean;
  initialize: () => Promise<void>;
  setValue: (dataKey: string, value: TelemetryValue) => void;
  setValues: (values: Partial<Telemetry>) => void;
  reset: () => void;
  setSource: (source: TelemetrySource) => void;
}

const STORAGE_KEY = "ac-hud.live-telemetry";
const CHANNEL_NAME = "ac-hud.telemetry";

function isTelemetryObject(value: unknown): value is Telemetry {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => item === null || ["number", "boolean", "string"].includes(typeof item))
  );
}

let loadPromise: Promise<void> | null = null;
let syncInitialized = false;
let telemetryChannel: BroadcastChannel | null = null;
let telemetryEventSource: EventSource | null = null;

function readPersistedTelemetry(): Telemetry | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isTelemetryObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persistTelemetry(telemetry: Telemetry) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(telemetry));
  } catch {
    // Storage can be unavailable in private browsing or restricted contexts.
  }
}

function publishTelemetry(telemetry: Telemetry) {
  telemetryChannel?.postMessage({ type: "telemetry-update", telemetry });
}

function applyExternalTelemetry(value: unknown) {
  if (!isTelemetryObject(value)) return;
  useTelemetryStore.setState({ telemetry: value });
}

function initializeSync() {
  if (syncInitialized || typeof window === "undefined") return;
  syncInitialized = true;

  if (typeof BroadcastChannel !== "undefined") {
    telemetryChannel = new BroadcastChannel(CHANNEL_NAME);
    telemetryChannel.addEventListener("message", (event: MessageEvent<unknown>) => {
      if (typeof event.data !== "object" || event.data === null) return;
      const message = event.data as { type?: unknown; telemetry?: unknown };
      if (message.type === "telemetry-update") applyExternalTelemetry(message.telemetry);
    });
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      applyExternalTelemetry(JSON.parse(event.newValue));
    } catch {
      // Ignore malformed storage events from another tab.
    }
  });
}

function telemetryEquals(left: Telemetry, right: Telemetry): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => left[key] === right[key]);
}

async function pushTelemetryToServer(telemetry: Telemetry) {
  try {
    await fetch(`${CONFIG_API_URL}/telemetry`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(telemetry),
    });
  } catch {
    // Keep the local runtime source working when the optional sync server is unavailable.
  }
}

async function readTelemetryFromServer(): Promise<Telemetry | null> {
  try {
    const response = await fetch(`${CONFIG_API_URL}/telemetry?ts=${Date.now()}`);
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    return isTelemetryObject(payload) ? payload : null;
  } catch {
    return null;
  }
}

function applySyncedTelemetry(telemetry: Telemetry) {
  const current = useTelemetryStore.getState().telemetry;
  if (telemetryEquals(current, telemetry)) return;
  useTelemetryStore.setState({ telemetry });
  persistTelemetry(telemetry);
  publishTelemetry(telemetry);
}

function startServerSync() {
  if (telemetryEventSource || typeof window === "undefined" || typeof EventSource === "undefined") return;

  telemetryEventSource = new EventSource(`${CONFIG_API_URL}/telemetry/events`);
  telemetryEventSource.onmessage = (event) => {
    try {
      const payload: unknown = JSON.parse(event.data);
      if (isTelemetryObject(payload)) applySyncedTelemetry(payload);
    } catch {
      // Ignore malformed events and let EventSource reconnect automatically.
    }
  };
  telemetryEventSource.onerror = () => {
    // EventSource retries automatically. Keep the last valid telemetry visible.
  };
}

export const useTelemetryStore = create<TelemetryStore>((set, get) => ({
  telemetry: {},
  baseline: {},
  source: "live-test",
  isLoading: true,
  error: null,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    if (loadPromise) return loadPromise;
    initializeSync();

    loadPromise = fetch(`/capture.json?ts=${Date.now()}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Failed to load telemetry (${response.status})`);
        const payload: unknown = await response.json();
        if (!isTelemetryObject(payload)) throw new Error("Telemetry payload must be a flat object");
        const persisted = readPersistedTelemetry();
        const initialTelemetry = persisted ? { ...payload, ...persisted } : payload;
        persistTelemetry(initialTelemetry);
        set({ telemetry: initialTelemetry, baseline: payload, isLoading: false, error: null, initialized: true });
        startServerSync();
        if (persisted) {
          void pushTelemetryToServer(initialTelemetry);
        } else {
          void readTelemetryFromServer().then((remoteTelemetry) => {
            if (remoteTelemetry) applySyncedTelemetry(remoteTelemetry);
          });
        }
      })
      .catch((loadError) => {
        set({
          isLoading: false,
          error: loadError instanceof Error ? loadError : new Error("Failed to load telemetry"),
          initialized: true,
        });
      })
      .finally(() => { loadPromise = null; });

    return loadPromise;
  },
  setValue: (dataKey, value) => {
    const telemetry: Telemetry = { ...useTelemetryStore.getState().telemetry };
    telemetry[dataKey] = value;
    set({ telemetry });
    persistTelemetry(telemetry);
    publishTelemetry(telemetry);
    void pushTelemetryToServer(telemetry);
  },
  setValues: (values) => {
    const telemetry: Telemetry = { ...useTelemetryStore.getState().telemetry };
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined) telemetry[key] = value;
    }
    set({ telemetry });
    persistTelemetry(telemetry);
    publishTelemetry(telemetry);
    void pushTelemetryToServer(telemetry);
  },
  reset: () => {
    const telemetry = { ...useTelemetryStore.getState().baseline };
    set({ telemetry });
    persistTelemetry(telemetry);
    publishTelemetry(telemetry);
    void pushTelemetryToServer(telemetry);
  },
  setSource: (source) => set({ source, error: source === "live-test" ? null : new Error(`${source === "acc" ? "ACC" : "Assetto Corsa"} source is not connected yet`) }),
}));
