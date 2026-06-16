const ARTICLES = [
  {
    title: "DSCR Loan Calculator: How It Works and What Counts as a Good Ratio",
    desc: "A plain-English breakdown of the DSCR formula, what lenders require, and how to know if a property qualifies before you make an offer.",
    href: "/guides/dscr-loan-calculator",
    tag: "DSCR",
    live: true,
  },
  {
    title: "Rental Property Cash Flow Calculator: A Complete Guide",
    desc: "How to calculate true cash flow on a rental property, including the expenses most new investors forget to account for.",
    href: "/guides/rental-cash-flow-calculator",
    tag: "Rental Analysis",
    live: true,
  },
  {
    title: "The 70% Rule for House Flipping, Explained",
    desc: "What the 70% rule actually means, how to calculate your max allowable offer, and when it makes sense to break the rule.",
    href: "/guides/70-percent-rule-house-flipping",
    tag: "Fix & Flip",
    live: true,
  },
  {
    title: "What Is a Good Cap Rate for a Rental Property?",
    desc: "Cap rate benchmarks by market type, how cap rate differs from cash-on-cash return, and why a 'good' cap rate depends on your strategy.",
    href: "/guides/good-cap-rate-rental-property",
    tag: "Rental Analysis",
    live: true,
  },
  {
    title: "How to Analyze a Rental Property: A Step-by-Step Guide",
    desc: "The full underwriting process investors use to evaluate a deal from first look to final offer.",
    href: "/guides/how-to-analyze-rental-property",
    tag: "Getting Started",
    live: false,
  },
];

export default function Guides() {
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
          <span style={{ fontWeight: 800, fontSize: 17, color: "#0D1B3E", letterSpacing: "-0.3px" }}>SpreadRun</span>
        </a>
        <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
          <a href="/#features" style={{ fontSize: 14, fontWeight: 500, color: "#6B7A99", textDecoration: "none" }}>Features</a>
          <a href="/#pricing" style={{ fontSize: 14, fontWeight: 500, color: "#6B7A99", textDecoration: "none" }}>Pricing</a>
          <a href="/guides" style={{ fontSize: 14, fontWeight: 700, color: "#0B5FFF", textDecoration: "none" }}>Guides</a>
          <a href="/app" style={{
            background: "#0B5FFF", color: "#fff", fontSize: 13, fontWeight: 700,
            padding: "8px 18px", borderRadius: 8, textDecoration: "none",
          }}>Try Free →</a>
        </div>
      </nav>

      <section style={{ background: "#0D1B3E", padding: "64px 24px 56px", textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#7EB3FF", textTransform: "uppercase", marginBottom: 14 }}>Guides</div>
        <h1 style={{ fontSize: "clamp(30px, 5vw, 46px)", fontWeight: 900, color: "#fff", letterSpacing: "-1px", margin: "0 0 16px" }}>
          Learn how to underwrite a deal.
        </h1>
        <p style={{ fontSize: 16, color: "#8FA8CC", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
          Straightforward explainers on the numbers that matter — written for investors, not textbooks.
        </p>
      </section>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "56px 24px 100px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {ARTICLES.map(a => (
            <a key={a.href} href={a.live ? a.href : undefined} style={{
              display: "block", textDecoration: "none",
              border: "1.5px solid #EBF0FF", borderRadius: 14,
              padding: "26px 28px",
              opacity: a.live ? 1 : 0.55,
              cursor: a.live ? "pointer" : "default",
              transition: "border-color 0.15s",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 10 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0D1B3E", margin: 0, letterSpacing: "-0.2px", lineHeight: 1.3 }}>{a.title}</h2>
                <span style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
                  color: "#0B5FFF", background: "#EEF3FF",
                  padding: "3px 10px", borderRadius: 99, whiteSpace: "nowrap", flexShrink: 0,
                }}>{a.tag}</span>
              </div>
              <p style={{ fontSize: 14, color: "#6B7A99", lineHeight: 1.6, margin: 0 }}>{a.desc}</p>
              {!a.live && (
                <div style={{ fontSize: 12, fontWeight: 700, color: "#9BA8C0", marginTop: 12 }}>Coming soon</div>
              )}
              {a.live && (
                <div style={{ fontSize: 12, fontWeight: 700, color: "#0B5FFF", marginTop: 12 }}>Read guide →</div>
              )}
            </a>
          ))}
        </div>
      </div>

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
        <div style={{ display: "flex", gap: 20 }}>
          <a href="/privacy" style={{ fontSize: 12, color: "#9BA8C0", textDecoration: "none" }}>Privacy</a>
          <a href="/terms" style={{ fontSize: 12, color: "#9BA8C0", textDecoration: "none" }}>Terms</a>
        </div>
      </footer>
    </div>
  );
}
