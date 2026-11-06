import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import "./index.css";
import { Editor } from "./pages/editor/Editor";
import { Display } from "./pages/display/Display";
import { Home } from "./pages/Home";
import { Data } from "./pages/data/Data";
import "./pages/home.css";

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

  if (path === "/display") return <Display />;
  if (path === "/editor") return <Editor />;
  if (path === "/data") return <Data />;
  return <Home onOpenDisplay={() => navigate("/display")} onOpenEditor={() => navigate("/editor")} onOpenData={() => navigate("/data")} />;
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
