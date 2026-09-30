export const SUPPORT_EMAIL = "spreadrun@gmail.com";
export const COMPANY = "Zannetti Digital Assets LLC";

export const SectionTitle = ({ children }) => (
  <h2 style={{ fontSize: 20, fontWeight: 800, margin: "32px 0 12px", letterSpacing: "-0.3px" }}>{children}</h2>
);

export const P = ({ children }) => (
  <p style={{ fontSize: 15, color: "#3D4F6E", lineHeight: 1.7, margin: "0 0 16px" }}>{children}</p>
);

export const UL = ({ children }) => (
  <ul style={{ fontSize: 15, color: "#3D4F6E", lineHeight: 1.7, margin: "0 0 16px", paddingLeft: 22 }}>{children}</ul>
);

export default function LegalLayout({ title, updated, children }) {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: "#0D1B3E", background: "#fff" }}>
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)",
        borderBottom: "1px solid #EBF0FF", padding: "0 24px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 6, height: 22, background: "#0B5FFF", borderRadius: 2 }} />
          <span style={{ fontWeight: 800, fontSize: 17, color: "#0D1B3E", letterSpacing: "-0.3px" }}>SecondRing</span>
        </a>
        <a href="/contact" style={{ color: "#0B5FFF", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Contact</a>
      </nav>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "60px 24px 100px" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#0B5FFF", textTransform: "uppercase", marginBottom: 12 }}>Legal</div>
        <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-0.8px", margin: "0 0 8px" }}>{title}</h1>
        <p style={{ fontSize: 13, color: "#9BA8C0", marginBottom: 40 }}>Last updated: {updated}</p>

        {children}

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #EBF0FF", display: "flex", gap: 20, flexWrap: "wrap" }}>
          <a href="/" style={{ fontSize: 13, fontWeight: 700, color: "#0B5FFF", textDecoration: "none" }}>← Back to SecondRing</a>
          <a href="/terms" style={{ fontSize: 13, color: "#6B7A99", textDecoration: "none" }}>Terms</a>
          <a href="/privacy" style={{ fontSize: 13, color: "#6B7A99", textDecoration: "none" }}>Privacy</a>
        </div>
      </div>
    </div>
  );
}
