import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import "./index.css";
import { Editor } from "./pages/editor/Editor";
import { Display } from "./pages/display/Display";
import { ProfilePicker } from "./pages/display/ProfilePicker";

function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function App() {
  const [path, setPath] = useState(window.location.pathname.replace(/\/$/, "") || "/");

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname.replace(/\/$/, "") || "/");
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const displayMatch = path.match(/^\/display\/([^/]+)$/);
  if (displayMatch) return <Display profileId={decodeURIComponent(displayMatch[1])} />;
  if (path === "/editor") return <Editor />;
  return (
    <ProfilePicker
      onSelect={(profileId) => navigate(`/display/${encodeURIComponent(profileId)}`)}
      onOpenEditor={() => navigate("/editor")}
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}
