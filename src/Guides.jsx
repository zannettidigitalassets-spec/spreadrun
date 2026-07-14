import { useState, useEffect } from "react";
import { setPageMeta, PAGE_META } from "./seo.js";

const EDUCATIONAL_GUIDES = [
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
    live: true,
  },
  {
    title: "Real Estate Investing Terms Glossary",
    desc: "Plain-English definitions for every term you'll run into, from DSCR and ARV to cap rate, PITI, and the 70% rule.",
    href: "/guides/real-estate-terms-glossary",
    tag: "Reference",
    live: true,
  },
];

const MARKET_GUIDES = [
  {
    title: "Cleveland Rental Property Investing: A Real Numbers Guide",
    desc: "Why Cleveland ranks as a top cash-flow market, real rent-to-price ratios, and why neighborhood selection matters more here than almost anywhere else.",
    href: "/guides/cleveland-rental-property-investing",
    tag: "Market Guide",
    live: true,
  },
  {
    title: "Indianapolis Rental Property Investing: A Real Numbers Guide",
    desc: "Why Indianapolis is rated the most buyer-friendly market in the country, and how it compares to pure cash-flow plays like Cleveland.",
    href: "/guides/indianapolis-rental-property-investing",
    tag: "Market Guide",
    live: true,
  },
  {
    title: "Columbus Rental Property Investing: A Real Numbers Guide",
    desc: "Why Columbus combines strong cash flow with genuine population growth, and how Intel's semiconductor investment is reshaping the region.",
    href: "/guides/columbus-rental-property-investing",
    tag: "Market Guide",
    live: true,
  },
];

export default function Guides() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setPageMeta(PAGE_META.guides.title, PAGE_META.guides.description);
  }, []);

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: "#0D1B3E", background: "#fff" }}>
      <style>{`
        @media (max-width: 760px) {
          .sr-guides-nav-links-desktop {
            display: none !important;
          }
          .sr-guides-nav-hamburger {
            display: block !important;
          }
        }
      `}</style>
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)",
        borderBottom: "1px solid #EBF0FF", padding: "0 24px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
          <div style={{ width: 6, height: 22, background: "#0B5FFF", borderRadius: 2, flexShrink: 0 }} />
          <span style={{ fontWeight: 800, fontSize: 17, color: "#0D1B3E", letterSpacing: "-0.3px", whiteSpace: "nowrap" }}>SpreadRun</span>
        </a>

        <div className="sr-guides-nav-links-desktop" style={{ display: "flex", gap: 28, alignItems: "center" }}>
          <a href="/#features" style={{ fontSize: 14, fontWeight: 500, color: "#6B7A99", textDecoration: "none" }}>Features</a>
          <a href="/#pricing" style={{ fontSize: 14, fontWeight: 500, color: "#6B7A99", textDecoration: "none" }}>Pricing</a>
          <a href="/guides" style={{ fontSize: 14, fontWeight: 700, color: "#0B5FFF", textDecoration: "none" }}>Guides</a>
          <a href="/app" style={{
            background: "#0B5FFF", color: "#fff", fontSize: 13, fontWeight: 700,
            padding: "8px 18px", borderRadius: 8, textDecoration: "none",
          }}>Try Free →</a>
        </div>

        <button
          className="sr-guides-nav-hamburger"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
          style={{ display: "none", background: "none", border: "none", cursor: "pointer", padding: 8, flexShrink: 0 }}
        >
          <div style={{ width: 22, height: 2, background: "#0D1B3E", marginBottom: 5, borderRadius: 1 }} />
          <div style={{ width: 22, height: 2, background: "#0D1B3E", marginBottom: 5, borderRadius: 1 }} />
          <div style={{ width: 22, height: 2, background: "#0D1B3E", borderRadius: 1 }} />
        </button>
      </nav>

      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(13,27,62,0.4)", zIndex: 200, display: "flex", justifyContent: "flex-end" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", width: "78%", maxWidth: 320, height: "100%",
              padding: "24px 28px", display: "flex", flexDirection: "column", gap: 4,
              boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <span style={{ fontWeight: 800, fontSize: 17 }}>Menu</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
                style={{ background: "none", border: "none", fontSize: 22, color: "#6B7A99", cursor: "pointer", padding: 4 }}
              >
                ✕
              </button>
            </div>
            {[
              { href: "/#features", label: "Features" },
              { href: "/#pricing", label: "Pricing" },
              { href: "/guides", label: "Guides" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{ fontSize: 16, fontWeight: 600, color: "#0D1B3E", textDecoration: "none", padding: "14px 0", borderBottom: "1px solid #F0F4FF" }}
              >
                {link.label}
              </a>
            ))}
            <a
              href="/app"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: "block", textAlign: "center", marginTop: 20,
                background: "#0B5FFF", color: "#fff", fontSize: 15, fontWeight: 700,
                padding: "14px", borderRadius: 10, textDecoration: "none",
              }}
            >
              Try Free →
            </a>
          </div>
        </div>
      )}

      <section style={{ background: "#0D1B3E", padding: "64px 24px 56px", textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#7EB3FF", textTransform: "uppercase", marginBottom: 14 }}>Guides</div>
        <h1 style={{ fontSize: "clamp(30px, 5vw, 46px)", fontWeight: 900, color: "#fff", letterSpacing: "-1px", margin: "0 0 16px" }}>
          Learn how to underwrite a deal.
        </h1>
        <p style={{ fontSize: 16, color: "#8FA8CC", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
          Straightforward explainers on the numbers that matter — written for investors, not textbooks.
        </p>
      </section>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "56px 24px 0" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#0B5FFF", textTransform: "uppercase", marginBottom: 14 }}>How-To Guides</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {EDUCATIONAL_GUIDES.map(a => (
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

        {/* Market Guides Section */}
        <div style={{ marginTop: 56, paddingTop: 48, borderTop: "1px solid #EBF0FF" }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#0B5FFF", textTransform: "uppercase", marginBottom: 14 }}>Market Guides</div>
          <p style={{ fontSize: 14, color: "#6B7A99", margin: "0 0 24px", lineHeight: 1.6 }}>
            Real numbers on specific rental markets, rent-to-price ratios, DSCR financing fit, and what to watch before you buy.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {MARKET_GUIDES.map(a => (
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
                    color: "#00866B", background: "#E6F7F2",
                    padding: "3px 10px", borderRadius: 99, whiteSpace: "nowrap", flexShrink: 0,
                  }}>{a.tag}</span>
                </div>
                <p style={{ fontSize: 14, color: "#6B7A99", lineHeight: 1.6, margin: 0 }}>{a.desc}</p>
                {!a.live && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#9BA8C0", marginTop: 12 }}>Coming soon</div>
                )}
                {a.live && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#00866B", marginTop: 12 }}>Read guide →</div>
                )}
              </a>
            ))}
          </div>
        </div>

        {/* Free Calculator Tools Section */}
        <div style={{ marginTop: 56, paddingTop: 48, borderTop: "1px solid #EBF0FF" }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#0B5FFF", textTransform: "uppercase", marginBottom: 14 }}>Free Tools</div>
          <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px", margin: "0 0 8px" }}>Ready to run the numbers?</h2>
          <p style={{ fontSize: 15, color: "#6B7A99", margin: "0 0 28px", lineHeight: 1.6 }}>
            Free calculators for every deal type — no account required.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { href: "/rental-calculator", title: "Rental Property Calculator", desc: "Cash flow, cap rate, cash-on-cash return, and DSCR — instantly." },
              { href: "/flip-calculator", title: "Fix & Flip Calculator", desc: "Profit, ROI, maximum allowable offer, and 70% rule check." },
              { href: "/dscr-calculator", title: "DSCR Calculator", desc: "See if your rental property qualifies for investor financing." },
            ].map(tool => (
              <a key={tool.href} href={tool.href} style={{
                display: "block", textDecoration: "none",
                border: "1.5px solid #EBF0FF", borderRadius: 14,
                padding: "22px 28px", background: "#fff",
                transition: "border-color 0.15s",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0D1B3E", margin: "0 0 6px", letterSpacing: "-0.2px" }}>{tool.title}</h3>
                    <p style={{ fontSize: 14, color: "#6B7A99", margin: 0, lineHeight: 1.5 }}>{tool.desc}</p>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0B5FFF", whiteSpace: "nowrap" }}>Try free →</div>
                </div>
              </a>
            ))}
          </div>
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
