import type { CSSProperties } from "react";
import { WidgetRenderer, type WidgetConfig, type WidgetValues } from "../../components/widgets/WidgetRenderer";

const previewWidgets: WidgetConfig[] = [
  {
    id: "w_best_lap",
    type: "stat-box",
    x: 120,
    y: 40,
    w: 180,
    h: 70,
    payload: { dataKey: "lap.best", label: "BEST LAP", unit: null, decimals: 3 },
  },
  {
    id: "w_engine",
    type: "stat-group",
    x: 340,
    y: 40,
    w: 240,
    h: 150,
    payload: {
      rows: [
        { dataKey: "engine.oilTemp", label: "OIL TEMP", unit: "°C" },
        { dataKey: "engine.oilPressure", label: "OIL PRESS", unit: "bar", decimals: 1 },
        { dataKey: "engine.waterTemp", label: "WATER TEMP", unit: "°C" },
        { dataKey: "engine.waterPressure", label: "WATER PRESS", unit: "bar", decimals: 1 },
      ],
    },
  },
  {
    id: "w_speed",
    type: "raw-value",
    x: 120,
    y: 180,
    w: 180,
    h: 80,
    payload: { dataKey: "speed", suffix: " km/h", fontSize: 48 },
  },
  {
    id: "w_delta",
    type: "raw-value",
    x: 340,
    y: 220,
    w: 180,
    h: 80,
    payload: { dataKey: "delta", showSign: true, decimals: 3, fontSize: 48 },
  },
  {
    id: "w_future",
    type: "rpm-bar",
    x: 620,
    y: 40,
    w: 220,
    h: 60,
  },
];

const previewValues: WidgetValues = {
  "lap.best": 98.456,
  "engine.oilTemp": 102,
  "engine.oilPressure": 4.8,
  "engine.waterTemp": 87,
  "engine.waterPressure": 1.6,
  speed: 180,
  delta: -0.342,
};

export function DisplayPreview() {
  return (
    <main style={{ padding: 24, background: "#0b0d11", minHeight: "100vh" }}>
      <div
        style={{
          position: "relative",
          width: 960,
          height: 540,
          overflow: "hidden",
          background: "#11151c",
        }}
      >
        {previewWidgets.map((widget) => {
          const widgetStyle = {
            position: "absolute",
            left: widget.x,
            top: widget.y,
            width: widget.w,
            height: widget.h,
            zIndex: widget.zIndex,
          } as CSSProperties;

          return (
            <div key={widget.id} style={widgetStyle}>
              <WidgetRenderer widget={widget} values={previewValues} />
            </div>
          );
        })}
      </div>
    </main>
  );
}
