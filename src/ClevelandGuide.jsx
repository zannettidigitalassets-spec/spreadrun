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

export default function ClevelandGuide() {
  useEffect(() => {
    setPageMeta(
      "Cleveland Rental Property Investing: DSCR Loans & Cash Flow Guide | SpreadRun",
      "A real numbers breakdown of investing in Cleveland rental properties — rent-to-price ratios, DSCR loan qualification, and which neighborhoods actually cash flow.",
      "/guides/cleveland-rental-property-investing"
    );
  }, []);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: "#0D1B3E", background: "#fff" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          { "@type": "Question", "name": "Is Cleveland a good market for rental property investing?", "acceptedAnswer": { "@type": "Answer", "text": "Cleveland is consistently ranked among the top US markets for rental cash flow, with average rental yields around 9.8% — well above the national average. Low entry prices combined with steady rental demand make it a popular choice for both local and out-of-state investors, though neighborhood selection matters significantly more than in most markets." } },
          { "@type": "Question", "name": "What is a good rent-to-price ratio in Cleveland?", "acceptedAnswer": { "@type": "Answer", "text": "The national median rent-to-price ratio is around 165 (meaning a property's price is roughly 165 times its monthly rent). Strong cash-flow markets like Cleveland often run between 90 and 145, meaning monthly rent represents a higher percentage of the purchase price than in expensive coastal markets." } },
          { "@type": "Question", "name": "Can I get a DSCR loan for a Cleveland rental property?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Cleveland's rent-to-price ratios and cash flow profile make it a strong fit for DSCR loans, which qualify based on the property's rental income rather than personal income. At current DSCR rates, most lenders want to see a 1.25+ ratio at purchase to provide a safety margin for vacancy and repairs." } },
          { "@type": "Question", "name": "Which Cleveland neighborhoods are best for rental investing?", "acceptedAnswer": { "@type": "Answer", "text": "Neighborhood selection matters more in Cleveland than the citywide averages suggest. C-class areas can carry delinquency rates of 18% or higher, which erodes the cash flow advantage on paper. Most experienced investors stick to B- or B-grade areas, where tenant quality and turnover costs are more predictable, even if the yield looks slightly lower than a C-class property on paper." } },
          { "@type": "Question", "name": "What property taxes should I expect in Cleveland?", "acceptedAnswer": { "@type": "Answer", "text": "Ohio's effective property tax rates typically run in the 0.4% to 0.9% Range — meaningfully lower than higher-tax states, which directly improves cash flow. On a $150,000 property, that difference compared to a 2%+ tax state can be worth several thousand dollars a year straight to the bottom line." } },
        ],
      }) }} />
      <style>{`
        @media (max-width: 760px) {
          .sr-clevelandguide-nav-links-desktop {
            display: none !important;
          }
          .sr-clevelandguide-nav-hamburger {
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

        <div className="sr-clevelandguide-nav-links-desktop" style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <a href="/guides" style={{ fontSize: 14, fontWeight: 500, color: "#6B7A99", textDecoration: "none" }}>All Guides</a>
          <a href="/app#dscr" style={{
            background: "#0B5FFF", color: "#fff", fontSize: 13, fontWeight: 700,
            padding: "8px 18px", borderRadius: 8, textDecoration: "none",
          }}>Try DSCR Calculator →</a>
        </div>

        <button
          className="sr-clevelandguide-nav-hamburger"
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
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#0B5FFF", textTransform: "uppercase", marginBottom: 14 }}>Market Guide</div>
        <h1 style={{ fontSize: "clamp(30px, 5vw, 44px)", fontWeight: 900, letterSpacing: "-1px", lineHeight: 1.1, margin: "0 0 20px" }}>
          Cleveland Rental Property Investing: A Real Numbers Guide
        </h1>
        <p style={{ fontSize: 17, color: "#6B7A99", lineHeight: 1.6, margin: "0 0 12px" }}>
          Why Cleveland consistently ranks as a top cash-flow market, what rent-to-price ratios actually look like, and why neighborhood selection matters more here than almost anywhere else.
        </p>
        <p style={{ fontSize: 13, color: "#9BA8C0" }}>Updated July 2026 · 9 min read</p>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 100px" }}>

        <P>Cleveland shows up on nearly every "best cities for rental cash flow" list for 2026, and for good reason — average rental yields around 9.8% put it well ahead of most coastal and Sun Belt markets. But yield alone doesn't tell you whether a specific deal actually works, and Cleveland is a market where the difference between a great investment and a headache often comes down to which side of a street you're on, not which city.</P>

        <SectionTitle>Why Cleveland Ranks So Well for Cash Flow</SectionTitle>
        <P>The math starts with entry price. Cleveland's median home prices remain well below the national average, while rents have stayed comparatively strong thanks to the city's diversified, relatively recession-resistant economy anchored by healthcare (the Cleveland Clinic is one of the largest employers in the region), manufacturing, and logistics.</P>
        <P>Low entry price plus steady rent is exactly the combination that drives a good rent-to-price ratio — the single number that predicts cash flow better than almost any other market indicator.</P>
        <Table rows={[
          ["Metric", "Approximate Range"],
          ["Median rental yield", "~9.8%"],
          ["Effective property tax rate", "0.4% – 0.9%"],
          ["Typical rent-to-price ratio", "90 – 145"],
          ["National median rent-to-price", "~165"],
        ]} />
        <P>A lower rent-to-price ratio number is better for cash flow — it means monthly rent represents a larger share of the purchase price. Cleveland's typical range of 90-145 compares favorably to the national median of around 165, which is a big part of why the city consistently shows up on cash-flow-focused investor lists.</P>

        <SectionTitle>The Property Tax Advantage</SectionTitle>
        <P>Ohio's effective property tax rates typically run between 0.4% and 0.9% — meaningfully lower than many popular investor markets in Texas or Illinois, where effective rates often run 2.0% to 2.7%. On a $150,000 property, that difference alone can be worth $2,000-3,000 a year in avoided tax expense, flowing straight through to cash flow.</P>
        <P>This is one of the quieter reasons Midwest markets like Cleveland, Columbus, and Indianapolis consistently outperform higher-profile Sun Belt markets on a pure cash-flow basis, even when headline rent numbers look similar.</P>

        <SectionTitle>Why Neighborhood Selection Matters More Here</SectionTitle>
        <P>This is the part general "best cities" lists tend to gloss over. Cleveland's citywide averages mask enormous block-by-block variation. C-class neighborhoods can carry tenant delinquency rates of 18% or higher — a number that quietly destroys the cash flow advantage that looked so good on paper during underwriting.</P>
        <Callout>
          <strong>Rule of thumb:</strong> most experienced Cleveland investors stick to B- or B-grade neighborhoods, even if the on-paper yield is a percentage point or two lower than a C-class alternative. The math on paper rarely survives contact with an 18% delinquency rate.
        </Callout>
        <P>Before committing to a specific property, talk to at least 2-3 local property management companies about the specific street or block, not just the zip code. Cleveland rewards investors who do this homework and punishes those who buy purely off a spreadsheet.</P>

        <SectionTitle>Financing a Cleveland Rental With a DSCR Loan</SectionTitle>
        <P>Cleveland's rent-to-price profile makes it a strong fit for DSCR loans — financing that qualifies based on the property's rental income rather than your personal income or tax returns. This is especially useful for out-of-state investors or anyone who already owns several properties and doesn't want each new purchase constrained by personal debt-to-income limits.</P>
        <P>At current DSCR rates (roughly 7.5%–8.5% as of mid-2026), the margin for error is thinner than it was a few years ago. Most lenders want to see a DSCR of at least 1.25 at purchase — enough cushion to absorb a vacancy month or an unexpected repair without the deal turning negative.</P>
        <P>Here's what that looks like on a representative Cleveland deal:</P>
        <Table rows={[
          ["Input", "Example Value"],
          ["Purchase price", "$135,000"],
          ["Loan amount (75% LTV)", "$101,250"],
          ["Monthly rent", "$1,150"],
          ["Est. monthly PITI", "$920"],
          ["DSCR", "1.25"],
        ]} />
        <P>That 1.25 ratio is right at the strong-qualifying threshold most DSCR lenders look for — meaning this deal would likely qualify for competitive rate tiers, not just marginal approval.</P>

        <SectionTitle>What to Watch Before You Buy</SectionTitle>
        <P><strong>Verify the rent estimate independently.</strong> Don't rely solely on a turnkey provider's pro forma. Call 2-3 local property managers and ask what comparable units on that specific block actually rent for, not the zip code average.</P>
        <P><strong>Budget realistically for maintenance.</strong> Cleveland's housing stock skews older. A conservative maintenance reserve — 8-10% of rent rather than the 5% sometimes used in newer-construction markets — better reflects the real cost of owning an older Midwest property.</P>
        <P><strong>Confirm the neighborhood grade, not just the zip code.</strong> Two properties three blocks apart can have meaningfully different tenant pools and delinquency risk. This is the single highest-leverage piece of due diligence in this market.</P>

        <SectionTitle>Run the Numbers on Your Cleveland Deal</SectionTitle>
        <P>Every Cleveland deal lives or dies on the same handful of numbers — rent, PITI, and DSCR. SpreadRun's calculators let you plug in your actual purchase price, financing terms, and rent estimate to see cash flow, cap rate, and DSCR instantly, so you can stress-test a deal before you make an offer rather than after.</P>

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
          This article is for informational purposes only and is not financial or investment advice. Market conditions, rents, and lending terms change — verify current figures with local property managers and lenders before making an investment decision.
        </div>

        <div style={{ marginTop: 32 }}>
          <div style={{
            background: "#F0F4FF", border: "1.5px solid #D6DFFF", borderRadius: 14,
            padding: "24px 28px", marginBottom: 32, textAlign: "center",
          }}>
            <div style={{ fontSize: 13, color: "#6B7A99", marginBottom: 12, lineHeight: 1.6 }}>
              Put these numbers to work — try our free rental and DSCR calculators, no account required.
            </div>
            <a href="/dscr-calculator" style={{
              display: "inline-block", background: "#0B5FFF", color: "#fff",
              fontSize: 14, fontWeight: 700, padding: "12px 28px",
              borderRadius: 10, textDecoration: "none",
            }}>
              👉 Free DSCR Calculator (No Sign-Up Required) →
            </a>
          </div>
          <a href="/" style={{ fontSize: 13, fontWeight: 700, color: "#0B5FFF", textDecoration: "none" }}>← Back to SpreadRun</a>
        </div>
      </div>
    </div>
  );
}
