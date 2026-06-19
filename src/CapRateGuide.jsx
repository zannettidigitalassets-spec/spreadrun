import { useState, useEffect } from "react";
import { setPageMeta, PAGE_META } from "./seo.js";

const SectionTitle = ({ children }) => (
  <h2 style={{ fontSize: 24, fontWeight: 800, margin: "40px 0 16px", letterSpacing: "-0.4px" }}>{children}</h2>
);
const SubTitle = ({ children }) => (
  <h3 style={{ fontSize: 18, fontWeight: 700, margin: "28px 0 10px" }}>{children}</h3>
);
const P = ({ children }) => (
  <p style={{ fontSize: 15.5, color: "#3D4F6E", lineHeight: 1.75, margin: "0 0 18px" }}>{children}</p>
);
const Callout = ({ children }) => (
  <div style={{ background: "#F0F4FF", border: "1px solid #D6DFFF", borderRadius: 12, padding: "20px 24px", margin: "24px 0", fontSize: 14.5, color: "#0D1B3E", lineHeight: 1.7 }}>{children}</div>
);
const Table = ({ rows }) => (
  <div style={{ border: "1px solid #EBF0FF", borderRadius: 10, overflow: "hidden", margin: "20px 0" }}>
    {rows.map((r, i) => (
      <div key={i} style={{
        display: "flex", justifyContent: "space-between", padding: "12px 18px",
        background: i === 0 ? "#0D1B3E" : i % 2 === 0 ? "#F8FAFF" : "#fff",
        borderBottom: i < rows.length - 1 ? "1px solid #EBF0FF" : "none",
        fontSize: 13.5, fontWeight: i === 0 ? 800 : 500,
        color: i === 0 ? "#fff" : "#0D1B3E",
      }}>
        <span>{r[0]}</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>{r[1]}</span>
      </div>
    ))}
  </div>
);

export default function CapRateGuide() {
  useEffect(() => {
    setPageMeta(PAGE_META.capRateGuide.title, PAGE_META.capRateGuide.description, PAGE_META.capRateGuide.faq);
  }, []);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: "#0D1B3E", background: "#fff" }}>
      <style>{`
        @media (max-width: 760px) {
          .sr-caprateguide-nav-links-desktop {
            display: none !important;
          }
          .sr-caprateguide-nav-hamburger {
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

        <div className="sr-caprateguide-nav-links-desktop" style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <a href="/guides" style={{ fontSize: 14, fontWeight: 500, color: "#6B7A99", textDecoration: "none" }}>All Guides</a>
          <a href="/app#rental" style={{
            background: "#0B5FFF", color: "#fff", fontSize: 13, fontWeight: 700,
            padding: "8px 18px", borderRadius: 8, textDecoration: "none",
          }}>Try Rental Analyzer →</a>
        </div>

        <button
          className="sr-caprateguide-nav-hamburger"
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
            <a
              href="/guides"
              onClick={() => setMobileMenuOpen(false)}
              style={{ fontSize: 16, fontWeight: 600, color: "#0D1B3E", textDecoration: "none", padding: "14px 0", borderBottom: "1px solid #F0F4FF" }}
            >
              All Guides
            </a>
            <a
              href="/app#rental"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: "block", textAlign: "center", marginTop: 20,
                background: "#0B5FFF", color: "#fff", fontSize: 15, fontWeight: 700,
                padding: "14px", borderRadius: 10, textDecoration: "none",
              }}
            >
              Try Rental Analyzer →
            </a>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px 40px" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#0B5FFF", textTransform: "uppercase", marginBottom: 14 }}>Guide</div>
        <h1 style={{ fontSize: "clamp(30px, 5vw, 44px)", fontWeight: 900, letterSpacing: "-1px", lineHeight: 1.1, margin: "0 0 20px" }}>
          What Is a Good Cap Rate for a Rental Property?
        </h1>
        <p style={{ fontSize: 17, color: "#6B7A99", lineHeight: 1.6, margin: "0 0 12px" }}>
          Cap rate benchmarks by market type, how it differs from cash-on-cash return, and why a "good" cap rate depends entirely on your strategy.
        </p>
        <p style={{ fontSize: 13, color: "#9BA8C0" }}>Updated June 2026 · 7 min read</p>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 100px" }}>
        <P>Cap rate is one of the most frequently cited numbers in real estate investing, and also one of the most misunderstood. Investors throw around phrases like "I only buy at an 8 cap" without always being clear on what that means or whether it's the right benchmark for their specific deal. This guide clears up what cap rate actually measures and what counts as good.</P>

        <SectionTitle>What Is Cap Rate?</SectionTitle>
        <P>Cap rate, short for capitalization rate, measures a property's annual return based purely on its income, completely independent of how it's financed. It answers the question: if I bought this property in all cash, what percentage return would the income alone generate?</P>
        <Callout><strong>Cap Rate = (Net Operating Income ÷ Property Value) × 100</strong></Callout>
        <P>Net Operating Income (NOI) is the property's annual income after operating expenses, but before mortgage payments. That's the key distinction that trips people up — cap rate deliberately excludes financing costs, which is what makes it useful for comparing properties on an apples-to-apples basis regardless of how each buyer plans to finance the deal.</P>

        <SectionTitle>A Worked Example</SectionTitle>
        <P>Take a property valued at $350,000 that generates $2,400 per month in rent, with $1,182 per month in operating expenses (taxes, insurance, maintenance, management — everything except the mortgage):</P>
        <Table rows={[
          ["Variable", "Amount"],
          ["Monthly Rent", "$2,400"],
          ["Monthly Operating Expenses", "-$1,182"],
          ["Monthly NOI", "$1,218"],
          ["Annual NOI", "$14,616"],
          ["Property Value", "$350,000"],
          ["Cap Rate", "4.18%"],
        ]} />
        <P>This property has roughly a 4.2% cap rate. Whether that's good or not depends entirely on context — which is the part most explanations skip.</P>

        <SectionTitle>Cap Rate Benchmarks by Market Type</SectionTitle>
        <P>There's no single "good" cap rate across the country, because cap rates are inversely tied to perceived risk and growth potential. Here's roughly how they trend:</P>
        <Table rows={[
          ["Market Type", "Typical Cap Rate Range"],
          ["Major coastal cities (SF, NYC, LA)", "2% – 4%"],
          ["Large secondary cities", "4% – 6%"],
          ["Midwest & smaller metro markets", "6% – 9%"],
          ["Rural or high-risk markets", "9%+"],
        ]} />
        <P>Lower cap rates generally mean the market is considered safer, has stronger appreciation potential, or both — investors accept a lower current income return because they expect the property's value to grow over time. Higher cap rates usually signal either higher risk, slower appreciation, or both, with the higher current income compensating for that risk.</P>

        <SectionTitle>Why a Low Cap Rate Isn't Automatically Bad</SectionTitle>
        <P>A common mistake is treating cap rate as the only metric that matters and dismissing anything under 6% as a bad deal. But cap rate only measures current income — it says nothing about appreciation, which is often the larger driver of total return in expensive, high-growth markets. An investor buying in a major city at a 3% cap rate may be underwriting the deal based on expected appreciation, not just current cash flow.</P>

        <SectionTitle>Cap Rate vs. Cash-on-Cash Return</SectionTitle>
        <P>These two metrics get confused constantly, but they measure different things. Cap rate ignores financing entirely and measures the property's return as if bought in cash. Cash-on-cash return specifically measures the return on the actual cash you invested, factoring in your mortgage payment and down payment.</P>
        <P>Two investors buying the identical property with different financing will get the exact same cap rate, but very different cash-on-cash returns depending on their down payment and interest rate. Cap rate tells you about the property. Cash-on-cash return tells you about your specific deal.</P>

        <SectionTitle>How to Use Cap Rate Practically</SectionTitle>
        <P>The most reliable use of cap rate is comparing similar properties within the same market, not comparing across different markets or property types. If two fourplexes in the same neighborhood are listed at different prices, cap rate is one of the fastest ways to see which one is priced more attractively relative to its income.</P>

        <SectionTitle>Calculate Cap Rate Instantly</SectionTitle>
        <P>SpreadRun's Rental Analyzer calculates cap rate automatically alongside cash-on-cash return, DSCR, and full monthly cash flow — so you can see all the angles on a deal at once rather than calculating each metric separately.</P>

        <div style={{ textAlign: "center", margin: "36px 0" }}>
          <a href="/app#rental" style={{
            display: "inline-block", background: "#0B5FFF", color: "#fff",
            fontSize: 15, fontWeight: 700, padding: "15px 32px",
            borderRadius: 12, textDecoration: "none",
          }}>
            Try the Free Rental Analyzer →
          </a>
        </div>

        <div style={{ marginTop: 50, paddingTop: 24, borderTop: "1px solid #EBF0FF", fontSize: 13, color: "#9BA8C0" }}>
          This article is for informational purposes only and is not financial advice. Cap rate benchmarks vary by market and change over time with interest rates and local conditions.
        </div>
        <div style={{ marginTop: 32 }}>
          <a href="/" style={{ fontSize: 13, fontWeight: 700, color: "#0B5FFF", textDecoration: "none" }}>← Back to SpreadRun</a>
        </div>
      </div>
    </div>
  );
}
