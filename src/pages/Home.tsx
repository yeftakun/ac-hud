import { useEffect, useState } from "react";
import { CONFIG_API_URL } from "../lib/configApi";

const ACTIVE_PROFILE_KEY = "ac-hud.active-profile";

interface ProfileSummary { id: string; name: string; }

interface HomeProps { onOpenDisplay: () => void; onOpenEditor: () => void; }

export function Home({ onOpenDisplay, onOpenEditor }: HomeProps) {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [activeId, setActiveId] = useState(() => localStorage.getItem(ACTIVE_PROFILE_KEY) ?? "profile_001");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;
    const timeoutId = window.setTimeout(() => controller.abort(), 5000);

    fetch(`${CONFIG_API_URL}/configs`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Config API returned ${response.status}`);
        return response.json() as Promise<ProfileSummary[]>;
      })
      .then((data) => {
        if (!mounted) return;
        setProfiles(data);
        if (data.length > 0 && !data.some((profile) => profile.id === activeId)) setActiveId(data[0].id);
      })
      .catch((loadError) => {
        if (!mounted) return;
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          setError("The config server did not respond within 5 seconds.");
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Failed to load profiles");
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  // The profile is selected after this initial list load; changing it must not
  // restart the request or leave the home screen in a loading state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openDisplay() {
    localStorage.setItem(ACTIVE_PROFILE_KEY, activeId);
    onOpenDisplay();
  }

  const activeProfile = profiles.find((profile) => profile.id === activeId);

  return (
    <main className="home-page">
      <header className="home-header">
        <div className="home-brand"><img className="home-brand__logo" src="/logo.png" alt="" /><span>AC Display Unit</span></div>
        <div className="home-header__tools"><span className="home-header__status"><span className="home-status-dot" /> READY</span></div>
      </header>
      <section className="home-shell">
        <section className="home-profile-readonly" aria-label="Loaded profile">
          <div className="home-profile-readonly__body">
            <span className="home-kicker">LOADED PROFILE</span>
            <strong>{loading ? "Loading profile…" : activeProfile?.name ?? "No profile loaded"}</strong>
            <small>{activeProfile?.id ?? (error ? "Unavailable" : "—")}</small>
          </div>
          <span className={`home-profile-readonly__status${error ? " is-error" : ""}`}>
            {loading ? "LOADING" : error ? "ERROR" : activeProfile ? "READY" : "NOT FOUND"}
          </span>
        </section>
        {error ? <div className="home-message home-message--error">Unable to load profile: {error}</div> : null}
        <section className="home-actions" aria-label="Quick actions">
          <button type="button" className="home-action home-action--display" onClick={openDisplay} disabled={loading || !activeProfile}>
            <span className="home-action__icon">▶</span><span className="home-action__content"><strong>Open Display</strong><small>Launch the loaded telemetry layout</small></span><span className="home-action__arrow">→</span>
          </button>
          <button type="button" className="home-action" onClick={onOpenEditor}>
            <span className="home-action__icon">✎</span><span className="home-action__content"><strong>Open Editor</strong><small>Arrange widgets and edit their properties</small></span><span className="home-action__arrow">→</span>
          </button>
        </section>
        <section className="home-support" aria-label="Support">
          <span className="home-kicker">PROJECT SUPPORT</span>
          <p>If AC Display Unit is useful to you, support its development.</p>
          <div className="home-support-links">
            <a className="home-kofi-button" href="https://ko-fi.com/B4A12A78JD" target="_blank" rel="noreferrer">Support me on Ko-fi</a>
            <a className="home-trakteer-button" href="https://trakteer.id/yefta_asyel" target="_blank" rel="noreferrer">Support me on Trakteer</a>
          </div>
        </section>
      </section>
      <footer className="home-footer"><span>AC Display Unit</span><span>Display · Editor</span></footer>
    </main>
  );
}
