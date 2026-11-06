import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Moveable from "react-moveable";
import type { StatBoxStyle, WidgetMode } from "../../components/widgets/StatBox";
import { WidgetRenderer, type WidgetConfig } from "../../components/widgets/WidgetRenderer";

const CONFIG_API_URL = "http://localhost:3001";
const PROFILE_ID = "profile_001";
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

interface Profile {
  schemaVersion: number;
  id: string;
  name: string;
  canvas: { w: number; h: number };
  widgets: WidgetConfig[];
}

const STYLE_DEFAULTS: Required<StatBoxStyle> = {
  boxBg: "#141820",
  boxBorder: "#2a3340",
  labelColor: "#a8b2c0",
  valueColor: "#ffffff",
};

const COLOR_FIELDS: Array<{ key: keyof StatBoxStyle; label: string }> = [
  { key: "boxBg", label: "Box background" },
  { key: "boxBorder", label: "Box border" },
  { key: "labelColor", label: "Label color" },
  { key: "valueColor", label: "Value color" },
];

const ADDABLE_WIDGET_TYPES = [
  "stat-box",
  "stat-group",
  "raw-value",
  "drs",
  "rpm-bar",
  "activation-lights",
  "tyres",
] as const;

type AddableWidgetType = (typeof ADDABLE_WIDGET_TYPES)[number];

const DEFAULT_DATA_KEYS: Record<AddableWidgetType, string> = {
  "stat-box": "lap.best",
  "stat-group": "engine.oilTemp",
  "raw-value": "speed",
  drs: "drs.active",
  "rpm-bar": "rpm",
  "activation-lights": "pit.active",
  tyres: "tyres.FL.psi",
};

function round(value: number): number {
  return Math.round(value);
}

function hasAreaOverlap(a: Pick<WidgetConfig, "x" | "y" | "w" | "h">, b: Pick<WidgetConfig, "x" | "y" | "w" | "h">) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function findOpenPosition(widgets: WidgetConfig[], w: number, h: number) {
  for (let y = 20; y <= CANVAS_HEIGHT - h; y += 20) {
    for (let x = 20; x <= CANVAS_WIDTH - w; x += 20) {
      const candidate = { x, y, w, h };
      if (!widgets.some((widget) => hasAreaOverlap(candidate, widget))) return { x, y };
    }
  }

  return { x: 20, y: 20 };
}

function createWidget(type: AddableWidgetType, dataKey: string, widgets: WidgetConfig[]): WidgetConfig {
  const dimensions: Record<AddableWidgetType, { w: number; h: number }> = {
    "stat-box": { w: 180, h: 70 },
    "stat-group": { w: 240, h: 150 },
    "raw-value": { w: 180, h: 80 },
    drs: { w: 120, h: 80 },
    "rpm-bar": { w: 240, h: 50 },
    "activation-lights": { w: 60, h: 180 },
    tyres: { w: 220, h: 220 },
  };
  const { w, h } = dimensions[type];
  const position = findOpenPosition(widgets, w, h);
  const id = `w_${type.replaceAll("-", "_")}_${crypto.randomUUID().slice(0, 8)}`;
  const style = { ...STYLE_DEFAULTS };

  let payload: Record<string, unknown> = { dataKey };
  if (type === "stat-box") payload = { dataKey, label: "NEW STAT", decimals: 2 };
  if (type === "stat-group") {
    payload = { rows: [{ dataKey, label: "NEW VALUE" }] };
  }
  if (type === "raw-value") payload = { dataKey, fontSize: 48 };
  if (type === "drs") payload = { dataKey, activeColor: "#2ee66b", inactiveColor: "#2a3340", label: "DRS" };
  if (type === "rpm-bar") {
    payload = {
      dataKey,
      redlineDataKey: "redline",
      style: "lamp",
      fillDirection: "edge-to-center",
      segments: 16,
      zones: [
        { upTo: 0.6, color: "#2ee66b" },
        { upTo: 0.85, color: "#ffd400" },
        { upTo: 1, color: "#ff3b30" },
      ],
    };
  }
  if (type === "activation-lights") {
    payload = {
      lampCount: 4,
      priority: ["abs", "tc", "pit"],
      states: {
        pit: { dataKey, color: "#ffd400", blink: true, blinkMs: 400 },
        abs: { dataKey: "abs.active", color: "#ff3b30", blink: false },
        tc: { dataKey: "tc.active", color: "#a855f7", blink: false },
      },
    };
  }
  if (type === "tyres") {
    payload = {
      dataKeys: {
        FL: { psi: dataKey, temp: "tyres.FL.temp" },
        FR: { psi: "tyres.FR.psi", temp: "tyres.FR.temp" },
        RL: { psi: "tyres.RL.psi", temp: "tyres.RL.temp" },
        RR: { psi: "tyres.RR.psi", temp: "tyres.RR.temp" },
      },
      tempThresholds: { cold: 70, optimal: 95, hot: 110 },
    };
  }

  return { id, type, ...position, w, h, zIndex: 2, style, payload };
}

export function Editor() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isAddPickerOpen, setIsAddPickerOpen] = useState(false);
  const [newWidgetType, setNewWidgetType] = useState<AddableWidgetType>("stat-box");
  const [newWidgetDataKey, setNewWidgetDataKey] = useState(DEFAULT_DATA_KEYS["stat-box"]);
  const elementRefs = useRef<Record<string, HTMLElement | null>>({});
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      try {
        const response = await fetch(`${CONFIG_API_URL}/configs/${PROFILE_ID}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Config API returned ${response.status}`);
        setProfile((await response.json()) as Profile);
        setLoadError(null);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadError(error instanceof Error ? error.message : "Failed to load profile");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadProfile();
    return () => controller.abort();
  }, []);

  const selectedWidget = profile?.widgets.find((widget) => widget.id === selectedId) ?? null;

  useEffect(() => {
    setSelectedElement(selectedId ? elementRefs.current[selectedId] ?? null : null);
  }, [selectedId, profile]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isEditingText = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT";
      if (event.key === "Delete" && selectedId && !isEditingText) {
        setProfile((current) => current ? { ...current, widgets: current.widgets.filter((widget) => widget.id !== selectedId) } : current);
        delete elementRefs.current[selectedId];
        setSelectedElement(null);
        setSelectedId(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId]);

  function updateWidget(widgetId: string, patch: Partial<WidgetConfig>) {
    setProfile((current) => {
      if (!current) return current;
      return {
        ...current,
        widgets: current.widgets.map((widget) =>
          widget.id === widgetId ? { ...widget, ...patch } : widget,
        ),
      };
    });
  }

  function updateSelectedStyle(key: keyof StatBoxStyle, value: string) {
    if (!selectedWidget) return;
    updateWidget(selectedWidget.id, {
      style: { ...selectedWidget.style, [key]: value },
    });
  }

  function updateSelectedPayload(key: string, value: string) {
    if (!selectedWidget) return;
    updateWidget(selectedWidget.id, {
      payload: { ...selectedWidget.payload, [key]: value },
    });
  }

  function addWidget() {
    setProfile((current) => {
      if (!current) return current;
      const widget = createWidget(newWidgetType, newWidgetDataKey.trim(), current.widgets);
      return { ...current, widgets: [...current.widgets, widget] };
    });
    setIsAddPickerOpen(false);
  }

  function deleteSelectedWidget() {
    if (!selectedId) return;
    setProfile((current) => current ? { ...current, widgets: current.widgets.filter((widget) => widget.id !== selectedId) } : current);
    delete elementRefs.current[selectedId];
    setSelectedElement(null);
    setSelectedId(null);
  }

  async function saveProfile() {
    if (!profile) return;
    setSaveState("saving");
    try {
      const response = await fetch(`${CONFIG_API_URL}/configs/${profile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!response.ok) throw new Error(`Config API returned ${response.status}`);
      setProfile((await response.json()) as Profile);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  if (loading) return <main style={pageStyle}>Loading profile…</main>;
  if (loadError || !profile) {
    return <main style={pageStyle}>Unable to load profile: {loadError ?? "Unknown error"}</main>;
  }

  const mode: WidgetMode = "edit";
  const selectedStyle = { ...STYLE_DEFAULTS, ...selectedWidget?.style };
  const selectedPayload = selectedWidget?.payload ?? {};
  const regularWidgets = profile.widgets.filter((widget) => widget.type !== "overlay-event");
  const overlayWidgets = profile.widgets.filter((widget) => widget.type === "overlay-event");

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <strong>{profile.name}</strong>
          <span style={{ marginLeft: 12, color: "#8b93a3", fontSize: 13 }}>Desktop editor</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setIsAddPickerOpen((open) => !open)}>
            Add Widget
          </button>
          <button type="button" onClick={deleteSelectedWidget} disabled={!selectedWidget}>
            Delete
          </button>
          <button type="button" onClick={() => void saveProfile()} disabled={saveState === "saving"}>
            {saveState === "saving" ? "Saving…" : "Save"}
          </button>
        </div>
      </header>

      {isAddPickerOpen ? (
        <section style={addPickerStyle}>
          <label style={pickerFieldStyle}>
            Type
            <select value={newWidgetType} onChange={(event) => {
              const type = event.target.value as AddableWidgetType;
              setNewWidgetType(type);
              setNewWidgetDataKey(DEFAULT_DATA_KEYS[type]);
            }}>
              {ADDABLE_WIDGET_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label style={pickerFieldStyle}>
            Initial dataKey
            <input value={newWidgetDataKey} onChange={(event) => setNewWidgetDataKey(event.target.value)} placeholder="e.g. rpm" />
          </label>
          <button type="button" onClick={addWidget}>Add to canvas</button>
        </section>
      ) : null}

      <div style={workspaceStyle}>
        <div
          ref={canvasRef}
          style={{
            position: "relative",
            flex: "0 0 auto",
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            overflow: "hidden",
            background: "#11151c",
            border: "1px solid #2a3340",
          }}
          onClick={() => setSelectedId(null)}
        >
          <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          {regularWidgets.map((widget) => {
            const isSelected = widget.id === selectedId;
            const widgetStyle = {
              position: "absolute",
              left: widget.x,
              top: widget.y,
              width: widget.w,
              height: widget.h,
              zIndex: widget.zIndex,
              outline: isSelected ? "1px solid #4f9cff" : "none",
            } as CSSProperties;

            return (
              <div
                key={widget.id}
                ref={(element) => {
                  elementRefs.current[widget.id] = element;
                }}
                style={widgetStyle}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedElement(event.currentTarget);
                  setSelectedId(widget.id);
                }}
              >
                <WidgetRenderer widget={widget} mode={mode} />
              </div>
            );
          })}
          </div>
          <div style={{ position: "absolute", inset: 0, zIndex: 1000, pointerEvents: "none" }}>
            {overlayWidgets.map((widget) => (
              <WidgetRenderer key={widget.id} widget={widget} mode={mode} />
            ))}
          </div>

          <Moveable
            target={selectedElement}
            container={canvasRef.current}
            origin={false}
            draggable
            resizable
            keepRatio={false}
            renderDirections={["nw", "n", "ne", "w", "e", "sw", "s", "se"]}
            onDrag={({ left, top }) => {
              if (selectedId) updateWidget(selectedId, { x: round(left), y: round(top) });
            }}
            onResize={({ width, height }) => {
              if (selectedId) updateWidget(selectedId, { w: round(width), h: round(height) });
            }}
          />
        </div>

        <aside style={sidebarStyle}>
          {selectedWidget ? (
            <>
              <h2 style={{ marginTop: 0 }}>Widget properties</h2>
              <div style={mutedStyle}>{selectedWidget.id} · {selectedWidget.type}</div>

              {typeof selectedPayload.label === "string" ? (
                <label style={fieldStyle}>
                  Label
                  <input
                    value={selectedPayload.label}
                    onChange={(event) => updateSelectedPayload("label", event.target.value)}
                  />
                </label>
              ) : null}

              {typeof selectedPayload.dataKey === "string" ? (
                <label style={fieldStyle}>
                  Data key
                  <input
                    value={selectedPayload.dataKey}
                    onChange={(event) => updateSelectedPayload("dataKey", event.target.value)}
                  />
                </label>
              ) : null}

              <div style={{ marginTop: 20, fontWeight: 700 }}>Colors</div>
              {COLOR_FIELDS.map(({ key, label }) => (
                <label key={key} style={colorFieldStyle}>
                  <span>{label}</span>
                  <input
                    type="color"
                    value={selectedStyle[key]}
                    onChange={(event) => updateSelectedStyle(key, event.target.value)}
                  />
                </label>
              ))}
            </>
          ) : (
            <div style={mutedStyle}>Select a widget to edit its properties.</div>
          )}
          {saveState === "saved" ? <div style={successStyle}>Saved.</div> : null}
          {saveState === "error" ? <div style={errorStyle}>Save failed.</div> : null}
        </aside>
      </div>
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  padding: 24,
  boxSizing: "border-box",
  color: "#ffffff",
  background: "#0b0d11",
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: CANVAS_WIDTH + 320,
  maxWidth: "100%",
  marginBottom: 16,
};

const workspaceStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 20,
  overflowX: "auto",
};

const addPickerStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  gap: 14,
  width: "fit-content",
  maxWidth: "100%",
  marginBottom: 16,
  padding: 14,
  border: "1px solid #2a3340",
  borderRadius: 8,
  background: "#141820",
};

const pickerFieldStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  color: "#a8b2c0",
  fontSize: 13,
};

const sidebarStyle: CSSProperties = {
  flex: "0 0 280px",
  minHeight: 300,
  padding: 18,
  boxSizing: "border-box",
  border: "1px solid #2a3340",
  borderRadius: 8,
  background: "#141820",
};

const fieldStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  marginTop: 16,
  color: "#a8b2c0",
  fontSize: 13,
};

const colorFieldStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginTop: 12,
  color: "#a8b2c0",
  fontSize: 13,
};

const mutedStyle: CSSProperties = { color: "#8b93a3", fontSize: 13 };
const successStyle: CSSProperties = { marginTop: 24, color: "#2ee66b", fontSize: 13 };
const errorStyle: CSSProperties = { marginTop: 24, color: "#ff6b6b", fontSize: 13 };
