import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Moveable from "react-moveable";
import { useHistory } from "../../hooks/useHistory";
import { FONT_OPTIONS, getFontStyle, isFontStyleKey } from "../../lib/fontOptions";
import type { StatBoxStyle, WidgetMode } from "../../components/widgets/StatBox";
import { WidgetRenderer, type WidgetConfig } from "../../components/widgets/WidgetRenderer";

const CONFIG_API_URL = "http://localhost:3001";
const PROFILE_ID = "profile_001";
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const CANVAS_BACKGROUND = "#11151c";

function navigateTo(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function isImportedWidget(value: unknown): value is WidgetConfig {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const widget = value as Record<string, unknown>;
  return (
    typeof widget.id === "string" &&
    typeof widget.type === "string" &&
    typeof widget.x === "number" &&
    typeof widget.y === "number" &&
    typeof widget.w === "number" &&
    typeof widget.h === "number"
  );
}

interface Profile {
  schemaVersion: number;
  id: string;
  name: string;
  canvas: { w: number; h: number; background?: string; fontFamily?: string };
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

function defaultValueFontSize(type: string): number | null {
  if (type === "stat-box") return 32;
  if (type === "stat-group") return 20;
  if (type === "raw-value") return 48;
  return null;
}

export function Editor() {
  const {
    present: profile,
    set: setProfile,
    replace: replaceProfile,
    beginTransaction,
    setTransient,
    commitTransaction,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory<Profile | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isAddPickerOpen, setIsAddPickerOpen] = useState(false);
  const [isGlobalPropertiesOpen, setIsGlobalPropertiesOpen] = useState(true);
  const [newWidgetType, setNewWidgetType] = useState<AddableWidgetType>("stat-box");
  const [newWidgetDataKey, setNewWidgetDataKey] = useState(DEFAULT_DATA_KEYS["stat-box"]);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const elementRefs = useRef<Record<string, HTMLElement | null>>({});
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      try {
        const response = await fetch(`${CONFIG_API_URL}/configs/${PROFILE_ID}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Config API returned ${response.status}`);
        replaceProfile((await response.json()) as Profile);
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
  }, [replaceProfile]);

  const selectedWidget = profile?.widgets.find((widget) => widget.id === selectedId) ?? null;

  useEffect(() => {
    setSelectedElement(selectedId ? elementRefs.current[selectedId] ?? null : null);
  }, [selectedId, profile]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => {
      setStageSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, [profile]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isEditingText = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT";
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && !isEditingText && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (modifier && !isEditingText && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (event.key === "Delete" && selectedId && !isEditingText) {
        setProfile((current) => current ? { ...current, widgets: current.widgets.filter((widget) => widget.id !== selectedId) } : current);
        delete elementRefs.current[selectedId];
        setSelectedElement(null);
        setSelectedId(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canRedo, canUndo, redo, selectedId, undo]);

  function updateWidget(widgetId: string, patch: Partial<WidgetConfig>, transient = false) {
    const updateProfile = transient ? setTransient : setProfile;
    updateProfile((current) => {
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

  function updateSelectedFontSize(value: string) {
    if (!selectedWidget) return;
    const fontSize = Number(value);
    if (!Number.isFinite(fontSize) || fontSize <= 0) return;
    updateWidget(selectedWidget.id, {
      payload: { ...selectedWidget.payload, fontSize },
    });
  }

  function updateSelectedZIndex(value: string) {
    if (!selectedWidget) return;
    const zIndex = Number(value);
    if (!Number.isInteger(zIndex)) return;
    updateWidget(selectedWidget.id, { zIndex });
  }

  function updateProfileName(value: string) {
    setProfile((current) => current ? { ...current, name: value } : current);
  }

  function updateCanvasDimension(key: "w" | "h", value: string) {
    const dimension = Number(value);
    if (!Number.isInteger(dimension) || dimension < 320 || dimension > 4000) return;
    setProfile((current) => current ? { ...current, canvas: { ...current.canvas, [key]: dimension } } : current);
  }

  function updateCanvasBackground(value: string) {
    setProfile((current) => current ? { ...current, canvas: { ...current.canvas, background: value } } : current);
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
      await response.json();
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  function exportProfile() {
    if (!profile) return;
    const fileContent = JSON.stringify(profile, null, 2);
    const blob = new Blob([fileContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = profile.name.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || profile.id;
    link.href = url;
    link.download = `${safeName}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setImportMessage(null);
  }

  async function importProfile(file: File | undefined) {
    if (!file || !profile) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("File harus berupa object JSON.");
      const imported = parsed as Record<string, unknown>;
      if (!Array.isArray(imported.widgets) || !imported.widgets.every(isImportedWidget)) {
        throw new Error("Format widgets tidak valid.");
      }
      const importedWidgets = imported.widgets.filter(isImportedWidget);
      if (typeof imported.canvas !== "object" || imported.canvas === null || Array.isArray(imported.canvas)) {
        throw new Error("Format canvas tidak valid.");
      }
      const importedCanvas = imported.canvas as Record<string, unknown>;
      if (typeof importedCanvas.w !== "number" || typeof importedCanvas.h !== "number") {
        throw new Error("Canvas harus memiliki w dan h.");
      }
      const importedCanvasWidth = importedCanvas.w;
      const importedCanvasHeight = importedCanvas.h;
      setProfile((current) => current ? {
        ...current,
        schemaVersion: typeof imported.schemaVersion === "number" ? imported.schemaVersion : current.schemaVersion,
        name: typeof imported.name === "string" ? imported.name : current.name,
        canvas: {
          w: importedCanvasWidth,
          h: importedCanvasHeight,
          background: typeof importedCanvas.background === "string" ? importedCanvas.background : current.canvas.background,
          fontFamily: isFontStyleKey(importedCanvas.fontFamily) ? importedCanvas.fontFamily : current.canvas.fontFamily,
        },
        widgets: importedWidgets,
      } : current);
      setSelectedId(null);
      setSelectedElement(null);
      setImportMessage(`Imported ${importedWidgets.length} widgets. Klik Save untuk menerapkan permanen.`);
    } catch (error) {
      setImportMessage(error instanceof Error ? `Import gagal: ${error.message}` : "Import gagal: format file tidak valid.");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  if (loading) return <main style={pageStyle}>Loading profile…</main>;
  if (loadError || !profile) {
    return <main style={pageStyle}>Unable to load profile: {loadError ?? "Unknown error"}</main>;
  }

  const mode: WidgetMode = "edit";
  const canvasWidth = profile.canvas.w || CANVAS_WIDTH;
  const canvasHeight = profile.canvas.h || CANVAS_HEIGHT;
  const canvasBackground = profile.canvas.background || CANVAS_BACKGROUND;
  const canvasFontStyle = getFontStyle(profile.canvas.fontFamily);
  const canvasFontKey = isFontStyleKey(profile.canvas.fontFamily) ? profile.canvas.fontFamily : "system";
  const canvasScale = Math.min(
    Math.max((stageSize.width - 48) / canvasWidth, 0.1),
    Math.max((stageSize.height - 48) / canvasHeight, 0.1),
    1,
  );
  const selectedStyle = { ...STYLE_DEFAULTS, ...selectedWidget?.style };
  const selectedPayload = selectedWidget?.payload ?? {};
  const regularWidgets = profile.widgets.filter((widget) => widget.type !== "overlay-event");
  const overlayWidgets = profile.widgets.filter((widget) => widget.type === "overlay-event");

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <span style={editorEyebrowStyle}>LAYOUT EDITOR</span>
          <strong style={{ display: "block", marginTop: 4 }}>{profile.name}</strong>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" style={quietButtonStyle} onClick={() => navigateTo("/")}>Home</button>
          <button
            type="button"
            style={quietButtonStyle}
            onClick={() => {
              localStorage.setItem("ac-hud.active-profile", profile.id);
              navigateTo("/display");
            }}
          >
            Display
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={(event) => void importProfile(event.target.files?.[0])}
          />
          <button type="button" style={quietButtonStyle} onClick={() => importInputRef.current?.click()}>Import</button>
          <button type="button" style={quietButtonStyle} onClick={exportProfile}>Export</button>
          <span style={fitBadgeStyle}>FIT {Math.round(canvasScale * 100)}%</span>
          <button type="button" onClick={undo} disabled={!canUndo} title="Undo (Ctrl/Cmd+Z)">Undo</button>
          <button type="button" onClick={redo} disabled={!canRedo} title="Redo (Ctrl/Cmd+Y)">Redo</button>
          <button type="button" style={primaryButtonStyle} onClick={() => setIsAddPickerOpen(true)}>+ Add Widget</button>
          <button type="button" onClick={deleteSelectedWidget} disabled={!selectedWidget}>
            Delete
          </button>
          <button type="button" onClick={() => void saveProfile()} disabled={saveState === "saving"}>
            {saveState === "saving" ? "Saving…" : "Save"}
          </button>
        </div>
      </header>

      {isAddPickerOpen ? (
        <div style={modalOverlayStyle} onMouseDown={(event) => { if (event.target === event.currentTarget) setIsAddPickerOpen(false); }}>
          <section style={modalStyle} role="dialog" aria-modal="true" aria-labelledby="add-widget-title">
            <div style={modalHeaderStyle}>
              <div><span style={editorEyebrowStyle}>WIDGET LIBRARY</span><h2 id="add-widget-title" style={{ margin: "6px 0 0" }}>Add widget</h2></div>
              <button type="button" style={closeButtonStyle} onClick={() => setIsAddPickerOpen(false)} aria-label="Close">×</button>
            </div>
            <p style={mutedStyle}>Pilih jenis widget, lalu tentukan data key awal. Semua perubahan masih lokal sampai Save ditekan.</p>
            <div style={typeGridStyle}>
              {ADDABLE_WIDGET_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  style={typeCardStyle(newWidgetType === type)}
                  onClick={() => { setNewWidgetType(type); setNewWidgetDataKey(DEFAULT_DATA_KEYS[type]); }}
                >
                  <strong>{type}</strong>
                  <small>{DEFAULT_DATA_KEYS[type]}</small>
                </button>
              ))}
            </div>
            <label style={fieldStyle}>
              Initial dataKey
              <input autoFocus value={newWidgetDataKey} onChange={(event) => setNewWidgetDataKey(event.target.value)} placeholder="e.g. rpm" />
            </label>
            <div style={modalFooterStyle}>
              <button type="button" style={quietButtonStyle} onClick={() => setIsAddPickerOpen(false)}>Cancel</button>
              <button type="button" style={primaryButtonStyle} onClick={addWidget}>Add to canvas</button>
            </div>
          </section>
        </div>
      ) : null}

      <div style={workspaceStyle}>
        <div ref={stageRef} style={stageStyle}>
          <div style={{ width: canvasWidth * canvasScale, height: canvasHeight * canvasScale }}>
            <div
              ref={canvasRef}
              style={{
                position: "relative",
                width: canvasWidth,
                height: canvasHeight,
                overflow: "hidden",
                background: canvasBackground,
                ...canvasFontStyle,
                border: "1px solid #2a3340",
                transform: `scale(${canvasScale})`,
                transformOrigin: "top left",
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
            onDragStart={beginTransaction}
            onDrag={({ left, top }) => {
              if (selectedId) updateWidget(selectedId, { x: round(left / canvasScale), y: round(top / canvasScale) }, true);
            }}
            onDragEnd={commitTransaction}
            onResizeStart={beginTransaction}
            onResize={({ width, height }) => {
              if (selectedId) updateWidget(selectedId, { w: round(width / canvasScale), h: round(height / canvasScale) }, true);
            }}
            onResizeEnd={commitTransaction}
          />
            </div>
          </div>
        </div>

        <aside style={sidebarStyle}>
          <section>
            <button
              type="button"
              style={drawerHeaderStyle}
              aria-expanded={isGlobalPropertiesOpen}
              onClick={() => setIsGlobalPropertiesOpen((open) => !open)}
            >
              <span>Global properties</span>
              <span style={drawerChevronStyle}>{isGlobalPropertiesOpen ? "⌃" : "⌄"}</span>
            </button>
            {isGlobalPropertiesOpen ? (
              <div>
                <label style={fieldStyle}>
                  Profile name
                  <input value={profile.name} onChange={(event) => updateProfileName(event.target.value)} />
                </label>
                <div style={dimensionGridStyle}>
                  <label style={fieldStyle}>
                    Canvas width
                    <input type="number" min={320} max={4000} step={1} value={canvasWidth} onChange={(event) => updateCanvasDimension("w", event.target.value)} />
                  </label>
                  <label style={fieldStyle}>
                    Canvas height
                    <input type="number" min={320} max={4000} step={1} value={canvasHeight} onChange={(event) => updateCanvasDimension("h", event.target.value)} />
                  </label>
                </div>
                <label style={colorFieldStyle}>
                  <span>Canvas background</span>
                  <input type="color" value={canvasBackground} onChange={(event) => updateCanvasBackground(event.target.value)} />
                </label>
                <label style={fieldStyle}>
                  Font style
                  <select
                    value={canvasFontKey}
                    onChange={(event) => setProfile((current) => current ? { ...current, canvas: { ...current.canvas, fontFamily: event.target.value } } : current)}
                  >
                    {FONT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              </div>
            ) : null}
          </section>

          <div style={{ marginTop: 26, paddingTop: 20, borderTop: "1px solid #2a3340" }}>
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

              {defaultValueFontSize(selectedWidget.type) !== null ? (
                <label style={fieldStyle}>
                  Value size (px)
                  <input
                    type="number"
                    min={8}
                    max={200}
                    step={1}
                    value={typeof selectedPayload.fontSize === "number"
                      ? selectedPayload.fontSize
                      : defaultValueFontSize(selectedWidget.type) ?? 32}
                    onChange={(event) => updateSelectedFontSize(event.target.value)}
                  />
                </label>
              ) : null}

              <label style={fieldStyle}>
                Overlay index (z-index)
                <input
                  type="number"
                  min={0}
                  max={9999}
                  step={1}
                  value={selectedWidget.zIndex ?? 2}
                  onChange={(event) => updateSelectedZIndex(event.target.value)}
                />
              </label>

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
          </div>
          {saveState === "saved" ? <div style={successStyle}>Saved.</div> : null}
          {saveState === "error" ? <div style={errorStyle}>Save failed.</div> : null}
          {importMessage ? <div style={importMessage.startsWith("Import gagal") ? errorStyle : successStyle}>{importMessage}</div> : null}
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

const editorEyebrowStyle: CSSProperties = {
  color: "#8b93a3",
  fontSize: 10,
  letterSpacing: "0.16em",
};

const fitBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "0 10px",
  border: "1px solid #2a3340",
  borderRadius: 6,
  color: "#8b93a3",
  fontSize: 11,
};

const quietButtonStyle: CSSProperties = {
  border: "1px solid #2a3340",
  color: "#a8b2c0",
  background: "#141820",
};

const primaryButtonStyle: CSSProperties = {
  border: "1px solid #8dc455",
  color: "#10150d",
  background: "#a8e063",
  fontWeight: 700,
};

const modalOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 2000,
  display: "grid",
  placeItems: "center",
  padding: 24,
  background: "rgba(3, 5, 7, 0.78)",
  backdropFilter: "blur(5px)",
};

const modalStyle: CSSProperties = {
  width: "min(620px, 100%)",
  maxHeight: "min(720px, 100%)",
  overflowY: "auto",
  padding: 24,
  boxSizing: "border-box",
  border: "1px solid #3b4b5b",
  borderRadius: 10,
  color: "#ffffff",
  background: "#141820",
  boxShadow: "0 24px 80px rgba(0, 0, 0, .45)",
};

const modalHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 20,
};

const closeButtonStyle: CSSProperties = {
  padding: "0 5px",
  border: 0,
  color: "#8b93a3",
  background: "transparent",
  fontSize: 28,
  lineHeight: 1,
  cursor: "pointer",
};

const typeGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
  marginTop: 20,
};

const typeCardStyle = (active: boolean): CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  gap: 7,
  minHeight: 70,
  padding: 12,
  border: `1px solid ${active ? "#a8e063" : "#2a3340"}`,
  borderRadius: 6,
  color: active ? "#eaffd9" : "#d4dce8",
  background: active ? "#21301e" : "#1b212b",
  textAlign: "left",
  cursor: "pointer",
});

const modalFooterStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 24,
  paddingTop: 18,
  borderTop: "1px solid #2a3340",
};

const workspaceStyle: CSSProperties = {
  display: "flex",
  height: "calc(100vh - 150px)",
  minHeight: 420,
  alignItems: "flex-start",
  gap: 20,
  overflow: "hidden",
};

const stageStyle: CSSProperties = {
  display: "grid",
  placeItems: "center",
  flex: "1 1 auto",
  minWidth: 0,
  height: "100%",
  overflow: "hidden",
  border: "1px solid #222b35",
  borderRadius: 8,
  background: "#0e1218",
  backgroundImage: "radial-gradient(#27313c 1px, transparent 1px)",
  backgroundSize: "18px 18px",
};

const sidebarStyle: CSSProperties = {
  flex: "0 0 280px",
  maxHeight: "100%",
  overflowY: "auto",
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

const dimensionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

const drawerHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  padding: "0 0 12px",
  border: 0,
  borderBottom: "1px solid #2a3340",
  color: "#ffffff",
  background: "transparent",
  fontSize: 16,
  fontWeight: 700,
  textAlign: "left",
  cursor: "pointer",
};

const drawerChevronStyle: CSSProperties = {
  color: "#8b93a3",
  fontSize: 20,
  lineHeight: 1,
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
