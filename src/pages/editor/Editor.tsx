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

function round(value: number): number {
  return Math.round(value);
}

export function Editor() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
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

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <strong>{profile.name}</strong>
          <span style={{ marginLeft: 12, color: "#8b93a3", fontSize: 13 }}>Desktop editor</span>
        </div>
        <button type="button" onClick={() => void saveProfile()} disabled={saveState === "saving"}>
          {saveState === "saving" ? "Saving…" : "Save"}
        </button>
      </header>

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
          {profile.widgets.map((widget) => {
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
                  setSelectedId(widget.id);
                }}
              >
                <WidgetRenderer widget={widget} mode={mode} />
              </div>
            );
          })}

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
