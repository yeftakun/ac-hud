import { useEffect, useState } from "react";
import { CONFIG_API_URL } from "../lib/configApi";

const ACTIVE_PROFILE_KEY = "ac-hud.active-profile";

interface ProfileSummary { id: string; name: string; }

interface HomeProps { onOpenDisplay: () => void; onOpenEditor: () => void; onOpenData: () => void; }

export function Home({ onOpenDisplay, onOpenEditor, onOpenData }: HomeProps) {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [activeId, setActiveId] = useState(() => localStorage.getItem(ACTIVE_PROFILE_KEY) ?? "profile_001");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${CONFIG_API_URL}/configs`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Config API returned ${response.status}`);
        return response.json() as Promise<ProfileSummary[]>;
      })
      .then((data) => {
        setProfiles(data);
        if (data.length > 0 && !data.some((profile) => profile.id === activeId)) setActiveId(data[0].id);
      })
      .catch((loadError) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load profiles");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [activeId]);

  function selectProfile(profileId: string) {
    setActiveId(profileId);
    localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
  }

  function openDisplay() {
    localStorage.setItem(ACTIVE_PROFILE_KEY, activeId);
    onOpenDisplay();
  }

  const activeProfile = profiles.find((profile) => profile.id === activeId);

  return (
    <main className="home-page">
      <header className="home-header">
        <div className="home-brand"><span className="home-brand__mark">+</span><span>AC HUD</span></div>
        <div className="home-header__tools"><button type="button" onClick={onOpenData}>Data test</button><span className="home-header__status"><span className="home-status-dot" /> LOCAL CONFIG MODE</span></div>
      </header>
      <section className="home-shell">
        <div className="home-intro">
          <div>
            <p className="home-kicker">TELEMETRY DISPLAY SYSTEM</p>
            <h1>Choose a workspace</h1>
            <p className="home-subtitle">Pilih layout HUD untuk ditampilkan atau buka editor untuk mengubah posisi, ukuran, dan warna widget.</p>
          </div>
          <div className="home-canvas-note"><span>CANVAS</span><strong>960 × 540</strong></div>
        </div>
        <section className="home-actions" aria-label="Quick actions">
          <button type="button" className="home-action home-action--display" onClick={openDisplay} disabled={loading || profiles.length === 0}>
            <span className="home-action__icon">▶</span><span className="home-action__content"><strong>Open Display</strong><small>{activeProfile ? activeProfile.name : "Pilih profile terlebih dahulu"}</small></span><span className="home-action__arrow">→</span>
          </button>
          <button type="button" className="home-action" onClick={onOpenEditor}>
            <span className="home-action__icon">✎</span><span className="home-action__content"><strong>Open Editor</strong><small>Atur layout dan properti widget</small></span><span className="home-action__arrow">→</span>
          </button>
        </section>
        <section className="home-profiles">
          <div className="home-section-title"><div><span className="home-kicker">CONFIGURATION FILES</span><h2>Available profiles</h2></div><span className="home-count">{loading ? "…" : `${profiles.length} profile${profiles.length === 1 ? "" : "s"}`}</span></div>
          {error ? <div className="home-message home-message--error">Tidak dapat memuat profile: {error}</div> : null}
          {loading ? <div className="home-message">Memuat configuration files…</div> : null}
          {!loading && !error && profiles.length === 0 ? <div className="home-message">Belum ada profile. Buka editor untuk mulai.</div> : null}
          <div className="home-profile-list">
            {profiles.map((profile, index) => (
              <button key={profile.id} type="button" className={`home-profile ${profile.id === activeId ? "home-profile--active" : ""}`} onClick={() => selectProfile(profile.id)}>
                <span className="home-profile__number">{String(index + 1).padStart(2, "0")}</span><span className="home-profile__body"><strong>{profile.name}</strong><small>{profile.id}</small></span><span className="home-profile__state">{profile.id === activeId ? "ACTIVE" : "SELECT"}</span>
              </button>
            ))}
          </div>
        </section>
      </section>
      <footer className="home-footer"><span>AC HUD</span><span>Display route: /display · Editor route: /editor</span></footer>
    </main>
  );
}
