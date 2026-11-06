import { useEffect, useState } from "react";

const CONFIG_API_URL = "http://localhost:3001";

export interface ProfileSummary {
  id: string;
  name: string;
}

interface ProfilePickerProps {
  onSelect: (profileId: string) => void;
}

export function ProfilePicker({ onSelect }: ProfilePickerProps) {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfiles() {
      try {
        const response = await fetch(`${CONFIG_API_URL}/configs`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Config API returned ${response.status}`);
        setProfiles((await response.json()) as ProfileSummary[]);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load profiles");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadProfiles();
    return () => controller.abort();
  }, []);

  return (
    <main style={pageStyle}>
      <section style={panelStyle}>
        <h1 style={{ marginTop: 0 }}>AC Telemetry HUD</h1>
        <p style={mutedStyle}>Pilih profile layout untuk display.</p>
        {loading ? <p style={mutedStyle}>Loading profiles…</p> : null}
        {error ? <p style={errorStyle}>{error}</p> : null}
        {!loading && !error && profiles.length === 0 ? (
          <p style={mutedStyle}>Belum ada profile tersimpan.</p>
        ) : null}
        <div style={listStyle}>
          {profiles.map((profile) => (
            <button key={profile.id} type="button" style={profileButtonStyle} onClick={() => onSelect(profile.id)}>
              <span>{profile.name}</span>
              <small style={mutedStyle}>{profile.id}</small>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  display: "grid",
  placeItems: "center",
  minHeight: "100vh",
  padding: 24,
  boxSizing: "border-box",
  color: "#ffffff",
  background: "#0b0d11",
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
};

const panelStyle: React.CSSProperties = {
  width: "min(440px, 100%)",
  padding: 24,
  boxSizing: "border-box",
  border: "1px solid #2a3340",
  borderRadius: 12,
  background: "#141820",
};

const listStyle: React.CSSProperties = { display: "grid", gap: 10, marginTop: 24 };

const profileButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  width: "100%",
  padding: "14px 16px",
  border: "1px solid #2a3340",
  borderRadius: 8,
  color: "#ffffff",
  background: "#1c2330",
  textAlign: "left",
  cursor: "pointer",
};

const mutedStyle: React.CSSProperties = { color: "#a8b2c0", fontSize: 13 };
const errorStyle: React.CSSProperties = { color: "#ff6b6b", fontSize: 13 };
