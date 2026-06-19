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
  <div style={{
    background: "#F0F4FF", border: "1px solid #D6DFFF", borderRadius: 12,
    padding: "20px 24px", margin: "24px 0", fontSize: 14.5, color: "#0D1B3E", lineHeight: 1.7,
  }}>{children}</div>
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

export default function DscrGuide() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: "#0D1B3E", background: "#fff" }}>
      <style>{`
        @media (max-width: 760px) {
          .sr-dscrguide-nav-links-desktop {
            display: none !important;
          }
          .sr-dscrguide-nav-hamburger {
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

        <div className="sr-dscrguide-nav-links-desktop" style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <a href="/guides" style={{ fontSize: 14, fontWeight: 500, color: "#6B7A99", textDecoration: "none" }}>All Guides</a>
          <a href="/app#dscr" style={{
            background: "#0B5FFF", color: "#fff", fontSize: 13, fontWeight: 700,
            padding: "8px 18px", borderRadius: 8, textDecoration: "none",
          }}>Try DSCR Calculator →</a>
        </div>

        <button
          className="sr-dscrguide-nav-hamburger"
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
              href="/app#dscr"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: "block", textAlign: "center", marginTop: 20,
                background: "#0B5FFF", color: "#fff", fontSize: 15, fontWeight: 700,
                padding: "14px", borderRadius: 10, textDecoration: "none",
              }}
            >
              Try DSCR Calculator →
            </a>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px 40px" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#0B5FFF", textTransform: "uppercase", marginBottom: 14 }}>Guide</div>
        <h1 style={{ fontSize: "clamp(30px, 5vw, 44px)", fontWeight: 900, letterSpacing: "-1px", lineHeight: 1.1, margin: "0 0 20px" }}>
          DSCR Loan Calculator: How It Works and What Counts as a Good Ratio
        </h1>
        <p style={{ fontSize: 17, color: "#6B7A99", lineHeight: 1.6, margin: "0 0 12px" }}>
          A plain-English breakdown of the DSCR formula, what lenders actually require, and how to know if a rental property will qualify for financing before you make an offer.
        </p>
        <p style={{ fontSize: 13, color: "#9BA8C0" }}>Updated June 2026 · 7 min read</p>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 100px" }}>

        <P>If you're financing a rental property as an investor rather than a homeowner, most lenders won't qualify you the same way they'd qualify a primary residence purchase. Instead of focusing heavily on your personal income, they look at whether the property itself generates enough rental income to cover the mortgage. That ratio is called DSCR, short for Debt Service Coverage Ratio, and it's the single number that determines whether a deal gets approved for an investor loan.</P>

        <SectionTitle>What Is DSCR?</SectionTitle>
        <P>DSCR measures how much income a property produces relative to its debt obligations. In simple terms, it answers one question: does the rent cover the mortgage payment, with room to spare?</P>
        <P>The formula is straightforward:</P>
        <Callout><strong>DSCR = Monthly Gross Rent ÷ Monthly PITI</strong> (Principal, Interest, Taxes, and Insurance)</Callout>
        <P>A DSCR of 1.0 means the rent exactly covers the mortgage payment, taxes, and insurance — breakeven, with zero cushion. A DSCR above 1.0 means the property generates more income than its debt obligations require. Below 1.0 means the rental income alone isn't enough to cover the property's costs, which is a red flag for lenders.</P>

        <SectionTitle>What Counts as a Good DSCR?</SectionTitle>
        <P>Lender requirements vary, but here's how the ranges generally break down across the DSCR loan market:</P>
        <Table rows={[
          ["DSCR Ratio", "What It Means"],
          ["Below 1.00", "Rent doesn't cover the mortgage — most lenders will decline"],
          ["1.00 – 1.19", "Breakeven to thin margin — may qualify with some lenders, often at a higher rate"],
          ["1.20 – 1.24", "Standard qualifying range for many DSCR loan programs"],
          ["1.25 – 1.49", "Strong — typically qualifies for the best available rates"],
          ["1.50+", "Excellent — significant cash flow cushion above debt obligations"],
        ]} />
        <P>Most DSCR loan programs use 1.25 as the benchmark for their best pricing tier, though some lenders will go as low as 1.0 or even allow no-ratio loans for borrowers with strong credit and larger down payments, usually at a tradeoff of a higher interest rate.</P>

        <SectionTitle>How to Calculate DSCR Step by Step</SectionTitle>
        <SubTitle>1. Find your monthly gross rent</SubTitle>
        <P>This is the rent the property is expected to generate, before subtracting any expenses. If the property is already leased, use the actual lease amount. If vacant, use a realistic market rent estimate, not an optimistic one.</P>
        <SubTitle>2. Calculate monthly PITI</SubTitle>
        <P>Add together the projected principal and interest payment on the loan, monthly property tax (annual tax bill divided by 12), and monthly homeowners insurance premium (annual premium divided by 12). Some lenders also factor in HOA dues if applicable.</P>
        <SubTitle>3. Divide rent by PITI</SubTitle>
        <P>Monthly Gross Rent ÷ Monthly PITI = your DSCR. For example, if a property rents for $2,400 per month and the total PITI is $1,920, the DSCR is 1.25 — right at the strong qualifying threshold.</P>

        <SectionTitle>Why DSCR Loans Are Popular With Investors</SectionTitle>
        <P>Unlike a conventional mortgage, DSCR loans don't require personal income verification, tax returns, or W-2s. The property qualifies based on its own cash flow, not the borrower's personal debt-to-income ratio. This makes DSCR loans especially useful for self-employed investors, those who own several properties already, or anyone whose personal income doesn't reflect their actual ability to manage a rental investment profitably.</P>
        <P>The tradeoff is typically a slightly higher interest rate and a larger required down payment, often in the 20-25% range, compared to owner-occupied financing.</P>

        <SectionTitle>What If Your DSCR Is Too Low?</SectionTitle>
        <P>If your numbers come in under the lender's minimum, there are a few practical levers to pull before walking away from a deal:</P>
        <P><strong>Increase the down payment.</strong> A larger down payment reduces the loan amount, which lowers the monthly principal and interest, raising the DSCR.</P>
        <P><strong>Negotiate the purchase price.</strong> A lower purchase price has the same effect — smaller loan, smaller payment, better ratio.</P>
        <P><strong>Shop for a better rate.</strong> A lower interest rate directly reduces the monthly PITI.</P>
        <P><strong>Re-examine the rent estimate.</strong> If you're underestimating achievable rent, getting a proper market rent analysis might show the deal qualifies after all.</P>

        <SectionTitle>Calculate Your DSCR Instantly</SectionTitle>
        <P>Running these numbers by hand works, but it's slow if you're evaluating several properties or want to quickly test different down payment and rate scenarios. SpreadRun's DSCR Qualifier does the math instantly — enter your loan terms and expected rent, and it tells you your exact ratio, whether you'd qualify, and exactly how much rent you'd need to hit the 1.25 benchmark.</P>

        <div style={{ textAlign: "center", margin: "36px 0" }}>
          <a href="/app#dscr" style={{
            display: "inline-block", background: "#0B5FFF", color: "#fff",
            fontSize: 15, fontWeight: 700, padding: "15px 32px",
            borderRadius: 12, textDecoration: "none",
          }}>
            Try the Free DSCR Calculator →
          </a>
        </div>

        <div style={{ marginTop: 50, paddingTop: 24, borderTop: "1px solid #EBF0FF", fontSize: 13, color: "#9BA8C0" }}>
          This article is for informational purposes only and is not financial or lending advice. DSCR requirements vary by lender and loan program — confirm specific qualification criteria with a mortgage professional.
        </div>

        <div style={{ marginTop: 32 }}>
          <a href="/" style={{ fontSize: 13, fontWeight: 700, color: "#0B5FFF", textDecoration: "none" }}>← Back to SpreadRun</a>
        </div>
      </div>
    </div>
  );
}
