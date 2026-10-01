import { useState } from "react";

const C = { ink: "#0D1B3E", body: "#2B3A5C", muted: "#6B7A99", accent: "#0B5FFF", line: "#D6DFFF" };
const input = { width: "100%", boxSizing: "border-box", padding: "12px 14px", fontSize: 16, border: `1.5px solid ${C.line}`, borderRadius: 10, fontFamily: "inherit", color: C.ink, marginBottom: 12 };

export default function EarlyAccessModal({ onClose }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState("idle"); // idle | sending | done | error
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      if (window.gtag) window.gtag("event", "early_access_submit", { source: "landing" });
      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(13,27,62,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 1000 }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Get early access"
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 420, fontFamily: "Inter, system-ui, sans-serif", color: C.body }}
      >
        {status === "done" ? (
          <div style={{ textAlign: "center" }}>
            <h2 style={{ color: C.ink, fontSize: 24, margin: "0 0 8px" }}>You're on the list.</h2>
            <p style={{ margin: "0 0 20px" }}>We'll email you the moment SecondRing opens up.</p>
            <button onClick={onClose} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "11px 22px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Close</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h2 style={{ color: C.ink, fontSize: 24, margin: "0 0 6px" }}>Get early access</h2>
            <p style={{ margin: "0 0 18px", fontSize: 15 }}>Tell us where to reach you. We'll only use this to let you know when SecondRing launches.</p>
            <input style={input} type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required maxLength={120} />
            <input style={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required maxLength={254} />
            <input
              type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true"
              value={company} onChange={(e) => setCompany(e.target.value)}
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
            />
            {error && <p role="alert" style={{ color: "#B42318", fontSize: 14, margin: "0 0 12px" }}>{error}</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" disabled={status === "sending"} style={{ flex: 1, background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "13px 20px", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: status === "sending" ? 0.7 : 1 }}>
                {status === "sending" ? "Sending…" : "Get early access"}
              </button>
              <button type="button" onClick={onClose} style={{ background: "none", border: `1.5px solid ${C.line}`, borderRadius: 10, padding: "13px 16px", fontSize: 15, fontWeight: 600, color: C.muted, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
