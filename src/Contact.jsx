import { useState } from "react";

const CONTACT_FORMSPREE_URL = "https://formspree.io/f/mkoalqyg";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | success | error

  const handleSubmit = async () => {
    if (!name || !email || !message) return;
    setStatus("sending");

    try {
      const res = await fetch(CONTACT_FORMSPREE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (res.ok) {
        setStatus("success");
        setName("");
        setEmail("");
        setMessage("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: "#0D1B3E", background: "#fff", minHeight: "100vh" }}>

      {/* NAV */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)",
        borderBottom: "1px solid #EBF0FF", padding: "0 24px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
          <div style={{ width: 6, height: 22, background: "#0B5FFF", borderRadius: 2 }} />
          <span style={{ fontWeight: 800, fontSize: 17, color: "#0D1B3E", letterSpacing: "-0.3px" }}>SpreadRun</span>
        </a>
        <a href="/app" style={{
          background: "#0B5FFF", color: "#fff", fontSize: 13, fontWeight: 700,
          padding: "8px 18px", borderRadius: 8, textDecoration: "none",
        }}>Try Free →</a>
      </nav>

      {/* CONTENT */}
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "64px 24px" }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#0B5FFF", textTransform: "uppercase", marginBottom: 12 }}>Contact</div>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 900, letterSpacing: "-0.8px", margin: "0 0 16px" }}>
            Get in touch
          </h1>
          <p style={{ fontSize: 15, color: "#6B7A99", lineHeight: 1.7, margin: 0 }}>
            Have a question, found a bug, or just want to say hello? Fill out the form below and we'll get back to you as soon as possible.
          </p>
        </div>

        {status === "success" ? (
          <div style={{
            background: "rgba(0,182,122,0.08)", border: "1px solid rgba(0,182,122,0.3)",
            borderRadius: 14, padding: "32px", textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0D1B3E", margin: "0 0 8px" }}>Message sent!</h2>
            <p style={{ fontSize: 14.5, color: "#6B7A99", margin: "0 0 20px" }}>
              Thanks for reaching out. We'll get back to you shortly.
            </p>
            <button
              onClick={() => setStatus("idle")}
              style={{
                background: "#0B5FFF", color: "#fff", border: "none", borderRadius: 10,
                padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}
            >
              Send another message
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7A99", display: "block", marginBottom: 6 }}>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                style={{
                  width: "100%", boxSizing: "border-box", padding: "12px 14px",
                  borderRadius: 10, border: "1.5px solid #EBF0FF", fontSize: 14.5,
                  outline: "none", fontFamily: "inherit",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7A99", display: "block", marginBottom: 6 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: "100%", boxSizing: "border-box", padding: "12px 14px",
                  borderRadius: 10, border: "1.5px solid #EBF0FF", fontSize: 14.5,
                  outline: "none", fontFamily: "inherit",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7A99", display: "block", marginBottom: 6 }}>Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's on your mind?"
                rows={6}
                style={{
                  width: "100%", boxSizing: "border-box", padding: "12px 14px",
                  borderRadius: 10, border: "1.5px solid #EBF0FF", fontSize: 14.5,
                  outline: "none", fontFamily: "inherit", resize: "vertical",
                }}
              />
            </div>
            {status === "error" && (
              <p style={{ fontSize: 13, color: "#D14343", margin: 0 }}>Something went wrong. Please try again.</p>
            )}
            <button
              onClick={handleSubmit}
              disabled={status === "sending" || !name || !email || !message}
              style={{
                background: "#0B5FFF", color: "#fff", border: "none", borderRadius: 10,
                padding: "14px", fontSize: 15, fontWeight: 700,
                cursor: status === "sending" || !name || !email || !message ? "default" : "pointer",
                opacity: status === "sending" || !name || !email || !message ? 0.6 : 1,
              }}
            >
              {status === "sending" ? "Sending..." : "Send Message"}
            </button>
          </div>
        )}

        <div style={{ marginTop: 48, paddingTop: 32, borderTop: "1px solid #EBF0FF" }}>
          <p style={{ fontSize: 13.5, color: "#9BA8C0", margin: 0, lineHeight: 1.7 }}>
            You can also reach us directly at{" "}
            <a href="mailto:spreadrun@gmail.com" style={{ color: "#0B5FFF", fontWeight: 600, textDecoration: "none" }}>
              spreadrun@gmail.com
            </a>
            . We typically respond within 1–2 business days.
          </p>
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{
        borderTop: "1px solid #EBF0FF", padding: "24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 5, height: 18, background: "#0B5FFF", borderRadius: 2 }} />
          <span style={{ fontWeight: 800, fontSize: 14 }}>SpreadRun</span>
        </div>
        <div style={{ fontSize: 12, color: "#9BA8C0" }}>
          © 2026 SpreadRun · For informational purposes only. Not financial advice.
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <a href="/" style={{ fontSize: 12, color: "#9BA8C0", textDecoration: "none" }}>Home</a>
          <a href="/app" style={{ fontSize: 12, color: "#9BA8C0", textDecoration: "none" }}>App</a>
          <a href="/privacy" style={{ fontSize: 12, color: "#9BA8C0", textDecoration: "none" }}>Privacy</a>
          <a href="/terms" style={{ fontSize: 12, color: "#9BA8C0", textDecoration: "none" }}>Terms</a>
        </div>
      </footer>
    </div>
  );
}
