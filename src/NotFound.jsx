import { useEffect } from "react";
import { setPageMeta } from "./seo.js";

export default function NotFound() {
  useEffect(() => {
    setPageMeta(
      "Page Not Found | SpreadRun",
      "The page you're looking for doesn't exist. Head back to SpreadRun's free real estate deal analyzer."
    );
  }, []);

  return (
    <div style={{
      minHeight: "100vh", background: "#F5F7FF", fontFamily: "'Inter', system-ui, sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 24, textAlign: "center",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
        <div style={{ width: 6, height: 22, background: "#0B5FFF", borderRadius: 2 }} />
        <span style={{ fontWeight: 800, fontSize: 17, color: "#0D1B3E" }}>SpreadRun</span>
      </div>
      <div style={{ fontSize: 64, fontWeight: 900, color: "#0B5FFF", fontFamily: "'IBM Plex Mono', monospace", marginBottom: 8 }}>
        404
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0D1B3E", margin: "0 0 10px" }}>
        Page not found
      </h1>
      <p style={{ fontSize: 14.5, color: "#6B7A99", marginBottom: 28, maxWidth: 380 }}>
        The page you're looking for doesn't exist or may have moved. Let's get you back on track.
      </p>
      <a
        href="/"
        style={{
          background: "#0B5FFF", color: "#fff", border: "none", borderRadius: 10,
          padding: "12px 24px", fontSize: 14.5, fontWeight: 700, textDecoration: "none",
        }}
      >
        ← Back to SpreadRun
      </a>
    </div>
  );
}
