import { useEffect, useState } from "react";
import { WidgetRenderer, type WidgetConfig } from "../../components/widgets/WidgetRenderer";
import { getFontStyle } from "../../lib/fontOptions";
import { CONFIG_API_URL } from "../../lib/configApi";

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

interface Profile {
  id: string;
  name: string;
  canvas: { w: number; h: number; background?: string; fontFamily?: string };
  widgets: WidgetConfig[];
}

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

interface WakeLockLike {
  request: (type: "screen") => Promise<WakeLockSentinelLike>;
}

export interface DisplayProps {
  profileId?: string;
}

export function Display({ profileId }: DisplayProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      const activeProfileId = profileId ?? localStorage.getItem("ac-hud.active-profile") ?? "profile_001";
      try {
        const response = await fetch(`${CONFIG_API_URL}/configs/${encodeURIComponent(activeProfileId)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Config API returned ${response.status}`);
        setProfile((await response.json()) as Profile);
        setError(null);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load profile");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadProfile();
    return () => controller.abort();
  }, [profileId]);

  useEffect(() => {
    function updateScale() {
      setScale(Math.min(window.innerWidth / CANVAS_WIDTH, window.innerHeight / CANVAS_HEIGHT));
    }

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  useEffect(() => {
    const wakeLockApi = (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock;
    let wakeLock: WakeLockSentinelLike | null = null;
    let disposed = false;

    async function requestWakeLock() {
      if (disposed || document.visibilityState !== "visible" || !wakeLockApi) return;
      try {
        wakeLock = await wakeLockApi.request("screen");
      } catch {
        // Wake Lock can be denied by the browser or unavailable outside HTTPS/localhost.
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") void requestWakeLock();
    }

    void requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLock) void wakeLock.release();
    };
  }, []);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  async function enterFullscreen() {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
  }

  if (loading) return <Status message="Loading display profile…" />;
  if (error || !profile) return <Status message={`Unable to load profile: ${error ?? "Unknown error"}`} />;

  const regularWidgets = profile.widgets.filter((widget) => widget.type !== "overlay-event");
  const overlayWidgets = profile.widgets.filter((widget) => widget.type === "overlay-event");

  return (
    <main style={displayPageStyle}>
      <div style={{ width: CANVAS_WIDTH * scale, height: CANVAS_HEIGHT * scale }}>
        <div
          style={{
            position: "relative",
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            overflow: "hidden",
            background: profile.canvas.background ?? "#11151c",
            ...getFontStyle(profile.canvas.fontFamily),
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <div className="display-widget-layer" style={{ position: "absolute", inset: 0, zIndex: 0 }}>
            {regularWidgets.map((widget) => (
              <div
                key={widget.id}
                style={{
                  position: "absolute",
                  left: widget.x,
                  top: widget.y,
                  width: widget.w,
                  height: widget.h,
                  zIndex: widget.zIndex,
                }}
              >
                <WidgetRenderer widget={widget} mode="display" />
              </div>
            ))}
          </div>
          <div className="display-overlay-layer" style={{ position: "absolute", inset: 0, zIndex: 1000, pointerEvents: "none" }}>
            {overlayWidgets.map((widget) => (
              <WidgetRenderer key={widget.id} widget={widget} mode="display" />
            ))}
          </div>
        </div>
      </div>
      {!isFullscreen && (
        <button type="button" style={fullscreenButtonStyle} onClick={() => void enterFullscreen()}>
          Fullscreen
        </button>
      )}
    </main>
  );
}

function Status({ message }: { message: string }) {
  return <main style={statusStyle}>{message}</main>;
}

const displayPageStyle: React.CSSProperties = {
  display: "grid",
  placeItems: "center",
  width: "100vw",
  height: "100vh",
  overflow: "hidden",
  position: "relative",
  color: "#ffffff",
  background: "#050608",
};

const fullscreenButtonStyle: React.CSSProperties = {
  position: "fixed",
  right: 16,
  bottom: 16,
  padding: "8px 12px",
  border: "1px solid #465064",
  borderRadius: 6,
  color: "#ffffff",
  background: "#141820cc",
  cursor: "pointer",
};

const statusStyle: React.CSSProperties = {
  display: "grid",
  placeItems: "center",
  width: "100vw",
  height: "100vh",
  color: "#ffffff",
  background: "#0b0d11",
};
