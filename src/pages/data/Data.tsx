import type { PointerEvent, KeyboardEvent } from "react";
import { useTelemetry, type Telemetry, type TelemetrySource, type TelemetryValue } from "../../hooks/useTelemetry";
import "./data.css";

function navigateTo(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function numberValue(telemetry: Telemetry, key: string, fallback = 0): number {
  return typeof telemetry[key] === "number" ? telemetry[key] as number : fallback;
}

interface SliderFieldProps {
  label: string;
  dataKey: string;
  telemetry: Telemetry;
  setValue: (key: string, value: TelemetryValue) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

function SliderField({ label, dataKey, telemetry, setValue, min, max, step = 1, unit }: SliderFieldProps) {
  const value = numberValue(telemetry, dataKey, min);
  return (
    <label className="data-slider">
      <span className="data-field__header"><span>{label}</span><strong>{value}{unit ? ` ${unit}` : ""}</strong></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => setValue(dataKey, Number(event.target.value))} />
      <span className="data-slider__limits"><small>{min}</small><small>{max}{unit ? ` ${unit}` : ""}</small></span>
    </label>
  );
}

interface ToggleButtonProps {
  label: string;
  dataKey: string;
  telemetry: Telemetry;
  setValue: (key: string, value: TelemetryValue) => void;
}

function ToggleButton({ label, dataKey, telemetry, setValue }: ToggleButtonProps) {
  const active = telemetry[dataKey] === true;
  return (
    <button type="button" className={`data-toggle ${active ? "is-active" : ""}`} onClick={() => setValue(dataKey, !active)}>
      <span className="data-toggle__lamp" /><span>{label}</span><strong>{active ? "ON" : "OFF"}</strong>
    </button>
  );
}

function MomentaryButton({ label, dataKey, telemetry, setValue }: ToggleButtonProps) {
  const active = telemetry[dataKey] === true;
  function press(value: boolean) { setValue(dataKey, value); }
  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    press(true);
  }
  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    press(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if ((event.key === "Enter" || event.key === " ") && !event.repeat) { event.preventDefault(); press(true); }
  }
  function handleKeyUp(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); press(false); }
  }
  return (
    <button type="button" className={`data-toggle data-toggle--momentary ${active ? "is-active" : ""}`} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerCancel={() => press(false)} onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} onBlur={() => press(false)}>
      <span className="data-toggle__lamp" /><span>{label}</span><strong>{active ? "HELD" : "HOLD"}</strong>
    </button>
  );
}

function Section({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return <section className="data-section"><div className="data-section__heading"><div><span>{eyebrow}</span><h2>{title}</h2></div></div><div className="data-section__body">{children}</div></section>;
}

const sources: Array<{ value: TelemetrySource; label: string }> = [
  { value: "live-test", label: "Live Test" },
  { value: "assetto-corsa", label: "Assetto Corsa" },
  { value: "acc", label: "Assetto Corsa Competizione" },
];

export function Data() {
  const { telemetry, isLoading, error, source, setValue, reset, setSource } = useTelemetry();
  const entries = Object.entries(telemetry).sort(([a], [b]) => a.localeCompare(b));

  return (
    <main className="data-page">
      <header className="data-header">
        <div className="data-brand"><span className="data-brand__mark">+</span><div><span className="data-eyebrow">TELEMETRY CONTROL</span><strong>Live data test</strong></div></div>
        <nav className="data-nav">
          <button type="button" onClick={() => navigateTo("/")}>Home</button>
          <button type="button" onClick={() => navigateTo("/editor")}>Editor</button>
          <button type="button" onClick={() => navigateTo("/display")}>Display</button>
        </nav>
      </header>

      <section className="data-toolbar">
        <label className="data-source"><span>DATA SOURCE</span><select value={source} onChange={(event) => setSource(event.target.value as TelemetrySource)}>{sources.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <div className="data-status"><span className={`data-status__dot ${error ? "is-error" : ""}`} />{error ? error.message : isLoading ? "Loading capture.json…" : source === "live-test" ? "Live Test synced across same-origin tabs" : "Source adapter pending"}</div>
        <button type="button" className="data-reset" onClick={reset}>Reset dummy data</button>
      </section>

      <div className="data-layout">
        <div className="data-controls">
          <Section eyebrow="01 / DRIVING" title="Vehicle state">
            <SliderField label="Speed" dataKey="speed" telemetry={telemetry} setValue={setValue} min={0} max={360} unit="km/h" />
            <SliderField label="RPM" dataKey="rpm" telemetry={telemetry} setValue={setValue} min={0} max={10000} step={100} />
            <SliderField label="Redline" dataKey="redline" telemetry={telemetry} setValue={setValue} min={5000} max={12000} step={100} />
            <SliderField label="Throttle" dataKey="throttle" telemetry={telemetry} setValue={setValue} min={0} max={100} unit="%" />
            <SliderField label="Brake" dataKey="brake" telemetry={telemetry} setValue={setValue} min={0} max={100} unit="%" />
            <SliderField label="Clutch" dataKey="clutch" telemetry={telemetry} setValue={setValue} min={0} max={100} unit="%" />
            <SliderField label="Steering" dataKey="steering" telemetry={telemetry} setValue={setValue} min={-1} max={1} step={0.01} />
            <SliderField label="Gear" dataKey="gear" telemetry={telemetry} setValue={setValue} min={0} max={8} />
            <SliderField label="Delta" dataKey="delta" telemetry={telemetry} setValue={setValue} min={-5} max={5} step={0.001} unit="s" />
            <SliderField label="Position" dataKey="position" telemetry={telemetry} setValue={setValue} min={1} max={40} />
          </Section>

          <Section eyebrow="02 / LAP & FUEL" title="Session data">
            <SliderField label="Lap counter" dataKey="lap.counter" telemetry={telemetry} setValue={setValue} min={0} max={99} />
            <SliderField label="Current lap" dataKey="lap.current" telemetry={telemetry} setValue={setValue} min={0} max={240} step={0.001} unit="s" />
            <SliderField label="Best lap" dataKey="lap.best" telemetry={telemetry} setValue={setValue} min={0} max={240} step={0.001} unit="s" />
            <SliderField label="Last lap" dataKey="lap.last" telemetry={telemetry} setValue={setValue} min={0} max={240} step={0.001} unit="s" />
            <SliderField label="Estimated lap" dataKey="lap.est" telemetry={telemetry} setValue={setValue} min={0} max={240} step={0.001} unit="s" />
            <SliderField label="Fuel" dataKey="fuel" telemetry={telemetry} setValue={setValue} min={0} max={120} step={0.1} unit="L" />
          </Section>

          <Section eyebrow="03 / ASSISTS" title="Driver aids">
            <SliderField label="ABS level" dataKey="abs" telemetry={telemetry} setValue={setValue} min={0} max={12} />
            <SliderField label="TC level" dataKey="tc" telemetry={telemetry} setValue={setValue} min={0} max={12} />
            <SliderField label="Brake bias" dataKey="bb" telemetry={telemetry} setValue={setValue} min={40} max={70} step={0.1} unit="%" />
            <div className="data-toggle-grid"><MomentaryButton label="ABS active" dataKey="abs.active" telemetry={telemetry} setValue={setValue} /><MomentaryButton label="TC active" dataKey="tc.active" telemetry={telemetry} setValue={setValue} /><ToggleButton label="Pit limiter" dataKey="pit.active" telemetry={telemetry} setValue={setValue} /><ToggleButton label="DRS active" dataKey="drs.active" telemetry={telemetry} setValue={setValue} /><ToggleButton label="DRS available" dataKey="drs.available" telemetry={telemetry} setValue={setValue} /><ToggleButton label="DRS enabled" dataKey="drs.enabled" telemetry={telemetry} setValue={setValue} /></div>
          </Section>

          <Section eyebrow="04 / ENGINE" title="Temperatures & pressure">
            <SliderField label="KERS charge" dataKey="kers.charge" telemetry={telemetry} setValue={setValue} min={0} max={100} unit="%" />
            <SliderField label="KERS input" dataKey="kers.input" telemetry={telemetry} setValue={setValue} min={0} max={100} unit="%" />
            <SliderField label="Turbo boost" dataKey="turbo.boost" telemetry={telemetry} setValue={setValue} min={0} max={5} step={0.1} unit="bar" />
            <SliderField label="Engine brake" dataKey="engine.brake" telemetry={telemetry} setValue={setValue} min={0} max={12} />
            <SliderField label="Oil temperature" dataKey="engine.oilTemp" telemetry={telemetry} setValue={setValue} min={50} max={150} unit="°C" />
            <SliderField label="Oil pressure" dataKey="engine.oilPressure" telemetry={telemetry} setValue={setValue} min={0} max={10} step={0.1} unit="bar" />
            <SliderField label="Water temperature" dataKey="engine.waterTemp" telemetry={telemetry} setValue={setValue} min={50} max={150} unit="°C" />
            <SliderField label="Water pressure" dataKey="engine.waterPressure" telemetry={telemetry} setValue={setValue} min={0} max={5} step={0.1} unit="bar" />
          </Section>

          <Section eyebrow="05 / TYRES" title="Tyre readings">
            {(["FL", "FR", "RL", "RR"] as const).map((corner) => <div className="data-tyre-row" key={corner}><strong>{corner}</strong><SliderField label="PSI" dataKey={`tyres.${corner}.psi`} telemetry={telemetry} setValue={setValue} min={15} max={40} step={0.1} /><SliderField label="Temp" dataKey={`tyres.${corner}.temp`} telemetry={telemetry} setValue={setValue} min={20} max={150} step={1} unit="°C" /><SliderField label="Wear" dataKey={`tyres.${corner}.wear`} telemetry={telemetry} setValue={setValue} min={0} max={100} step={0.1} unit="%" /></div>)}
          </Section>

          <Section eyebrow="06 / MOTION & CONDITIONS" title="Vehicle environment">
            <SliderField label="G-force lateral" dataKey="gforce.x" telemetry={telemetry} setValue={setValue} min={-3} max={3} step={0.01} unit="G" />
            <SliderField label="G-force longitudinal" dataKey="gforce.y" telemetry={telemetry} setValue={setValue} min={-3} max={3} step={0.01} unit="G" />
            <SliderField label="G-force vertical" dataKey="gforce.z" telemetry={telemetry} setValue={setValue} min={-3} max={3} step={0.01} unit="G" />
            <SliderField label="Tyres out" dataKey="tyres.out" telemetry={telemetry} setValue={setValue} min={0} max={4} />
            <SliderField label="Air temperature" dataKey="air.temp" telemetry={telemetry} setValue={setValue} min={-20} max={60} step={0.5} unit="°C" />
            <SliderField label="Road temperature" dataKey="road.temp" telemetry={telemetry} setValue={setValue} min={-20} max={80} step={0.5} unit="°C" />
            <div className="data-toggle-grid"><ToggleButton label="AI controlled" dataKey="car.ai" telemetry={telemetry} setValue={setValue} /></div>
          </Section>
        </div>

        <aside className="data-inspector">
          <div className="data-inspector__heading"><div><span className="data-eyebrow">FLAT PAYLOAD</span><h2>Telemetry values</h2></div><span>{entries.length} keys</span></div>
          <p className="data-inspector__hint">Semua widget membaca key flat ini melalui <code>useTelemetry()</code>.</p>
          <div className="data-table-wrap"><table><thead><tr><th>dataKey</th><th>value</th><th>type</th></tr></thead><tbody>{entries.map(([key, value]) => <tr key={key}><td>{key}</td><td>{String(value)}</td><td>{value === null ? "null" : typeof value}</td></tr>)}</tbody></table></div>
          <div className="data-preview-note"><span>ACTIVE PROFILE</span><strong>Display uses the same runtime data</strong><button type="button" onClick={() => navigateTo("/display")}>Open display ↗</button></div>
        </aside>
      </div>
    </main>
  );
}
