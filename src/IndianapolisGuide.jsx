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

export default function IndianapolisGuide() {
  useEffect(() => {
    setPageMeta(
      "Indianapolis Rental Property Investing: DSCR Loans & Cash Flow Guide | SpreadRun",
      "A real numbers breakdown of investing in Indianapolis rental properties: rent-to-price ratios, DSCR loan qualification, and why it's rated the #1 most buyer-friendly market.",
      "/guides/indianapolis-rental-property-investing"
    );
  }, []);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: "#0D1B3E", background: "#fff" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          { "@type": "Question", "name": "Is Indianapolis a good market for rental property investing?", "acceptedAnswer": { "@type": "Answer", "text": "Indianapolis is consistently rated one of the top US markets for real estate investors, often cited as the most buyer-friendly market nationally. It combines Midwest affordability with a diverse, stable economy spanning healthcare, logistics, manufacturing, and state government, which supports steady rental demand across economic cycles." } },
          { "@type": "Question", "name": "What is the average rent in Indianapolis?", "acceptedAnswer": { "@type": "Answer", "text": "Average rents in the Indianapolis metro are around $1,490-2,350 depending on property type and neighborhood, with turnkey single-family rentals often renting 10-15% above the national average relative to purchase price." } },
          { "@type": "Question", "name": "Can I get a DSCR loan for an Indianapolis rental property?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Indianapolis's rent-to-price ratios make it a strong fit for DSCR loans, which qualify based on the property's rental income rather than personal income. Most lenders want to see a DSCR of at least 1.25 at purchase for the best rate tiers." } },
          { "@type": "Question", "name": "Which Indianapolis neighborhoods are best for rental investing?", "acceptedAnswer": { "@type": "Answer", "text": "Class B single-family homes and small multifamily properties near revitalizing areas like Broad Ripple, Fountain Square, and downtown Indianapolis tend to perform well for cash flow investors. Outlying cities like Muncie, Anderson, and Elwood also offer turnkey opportunities below the metro median price." } },
          { "@type": "Question", "name": "How does Indianapolis compare to other Midwest cash-flow markets?", "acceptedAnswer": { "@type": "Answer", "text": "Indianapolis offers a slightly more balanced profile than pure cash-flow markets like Cleveland, combining solid rental yields with more consistent appreciation, thanks to stronger population growth and a more diversified regional economy." } },
        ],
      }) }} />
      <style>{`
        @media (max-width: 760px) {
          .sr-indyguide-nav-links-desktop {
            display: none !important;
          }
          .sr-indyguide-nav-hamburger {
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

        <div className="sr-indyguide-nav-links-desktop" style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <a href="/guides" style={{ fontSize: 14, fontWeight: 500, color: "#6B7A99", textDecoration: "none" }}>All Guides</a>
          <a href="/app#dscr" style={{
            background: "#0B5FFF", color: "#fff", fontSize: 13, fontWeight: 700,
            padding: "8px 18px", borderRadius: 8, textDecoration: "none",
          }}>Try DSCR Calculator →</a>
        </div>

        <button
          className="sr-indyguide-nav-hamburger"
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
          Indianapolis Rental Property Investing: A Real Numbers Guide
        </h1>
        <p style={{ fontSize: 17, color: "#6B7A99", lineHeight: 1.6, margin: "0 0 12px" }}>
          Why Indianapolis is rated the most buyer-friendly market in the country, what rent-to-price ratios look like, and how it compares to pure cash-flow plays like Cleveland.
        </p>
        <p style={{ fontSize: 13, color: "#9BA8C0" }}>Updated July 2026 · 8 min read</p>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 100px" }}>

        <P>Indianapolis shows up near the top of nearly every "best markets for investors" list for 2026. Unlike some Midwest cities that win purely on cash flow, Indianapolis earns its reputation with a more balanced mix: solid yields, real population growth, and a diversified economy that holds up across economic cycles.</P>

        <SectionTitle>Why Indianapolis Keeps Ranking #1</SectionTitle>
        <P>The city has earned the title of most buyer-friendly market in national rankings, meaning investors can get in at reasonable prices relative to rents, without the bidding-war dynamics of hotter Sun Belt metros. The economy spans healthcare, logistics, manufacturing, and state government, which means Indianapolis isn't dependent on a single industry the way some smaller Midwest markets are.</P>
        <Table rows={[
          ["Metric", "Approximate Value"],
          ["Median single-family sale price (2025)", "$284,099"],
          ["Annual appreciation rate", "7.39%"],
          ["10-year home value growth", "104.02%"],
          ["Average rent", "$1,492"],
          ["10-year rent growth", "45.79%"],
        ]} />
        <P>That combination, meaningful appreciation alongside steady rent growth, is what separates Indianapolis from pure cash-flow markets. You're not just collecting rent and waiting; the underlying asset is also building real equity at a healthy clip.</P>

        <SectionTitle>Turnkey Opportunities Beyond the Core Metro</SectionTitle>
        <P>Investors looking for even lower entry points often look to outlying cities in the Indianapolis metro area, places like Muncie, Anderson, Elwood, and Rockport. Turnkey providers in this network typically price single-family and duplex properties around $329,500 on average, roughly 8% below the national average, with rents around $2,350, about 15% above the national average relative to price.</P>
        <Callout>
          <strong>Why this matters:</strong> a lower purchase price with above-average rent is exactly the combination that produces a strong rent-to-price ratio, which is the single best predictor of whether a deal will actually cash flow once real expenses are factored in.
        </Callout>

        <SectionTitle>Best Neighborhoods for Cash Flow</SectionTitle>
        <P>Within the core city, Class B single-family homes and small multifamily properties (2-4 units) near revitalizing areas tend to perform best for investors. Neighborhoods like Broad Ripple, Fountain Square, and downtown Indianapolis attract young renters and professionals, supporting both occupancy and rent growth.</P>
        <P>Unlike some Midwest markets where block-by-block variation is extreme, Indianapolis's more diversified economic base means the gap between B-class and C-class neighborhoods tends to be less dramatic, though due diligence on specific submarkets is still worthwhile before committing capital.</P>

        <SectionTitle>Financing an Indianapolis Rental With a DSCR Loan</SectionTitle>
        <P>Indianapolis's rent-to-price profile makes it a strong candidate for DSCR financing, loans that qualify based on the property's rental income rather than your personal income or tax returns. This is especially useful for out-of-state investors or anyone scaling past the conventional lending limits tied to personal debt-to-income ratios.</P>
        <P>Here's what a representative Indianapolis deal might look like:</P>
        <Table rows={[
          ["Input", "Example Value"],
          ["Purchase price", "$285,000"],
          ["Loan amount (75% LTV)", "$213,750"],
          ["Monthly rent", "$1,900"],
          ["Est. monthly PITI", "$1,520"],
          ["DSCR", "1.25"],
        ]} />
        <P>That 1.25 ratio sits right at the strong-qualifying threshold most DSCR lenders target for their best rate tiers, a healthy starting point before accounting for vacancy or unexpected repairs.</P>

        <SectionTitle>Indianapolis vs. Pure Cash-Flow Markets</SectionTitle>
        <P>If you're comparing Indianapolis to a market like Cleveland, the tradeoff is straightforward: Cleveland typically offers a slightly higher immediate yield, while Indianapolis offers steadier long-term appreciation alongside solid (if not quite as extreme) cash flow. Neither approach is objectively better, it depends on whether you're prioritizing monthly income today or total return including equity growth over a longer hold.</P>
        <P>Many investors build portfolios that include both types of markets specifically for this reason, pairing pure cash-flow cities with more balanced growth markets like Indianapolis.</P>

        <SectionTitle>Run the Numbers on Your Indianapolis Deal</SectionTitle>
        <P>Whether you're looking at a turnkey property in the outlying metro or a Class B home near downtown, the same core numbers determine whether a deal works: rent, financing terms, and DSCR. SpreadRun's calculators let you plug in your actual numbers and see cash flow, cap rate, and DSCR instantly.</P>

        <div style={{ textAlign: "center", margin: "36px 0" }}>
          <a href="/app#dscr" style={{
            display: "inline-block", background: "#0B5FFF", color: "#fff",
            fontSize: 15, fontWeight: 700, padding: "15px 32px",
            borderRadius: 12, textDecoration: "none",
          }}>
            Try the Free DSCR Calculator →
          </a>
        </div>

        <SectionTitle>Other Midwest Markets Worth Comparing</SectionTitle>
        <P>Indianapolis's balanced profile is a great starting point, but it's worth seeing how it stacks up against neighboring markets:</P>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          <a href="/guides/cleveland-rental-property-investing" style={{
            display: "block", border: "1.5px solid #EBF0FF", borderRadius: 12,
            padding: "16px 20px", textDecoration: "none",
          }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0D1B3E", marginBottom: 4 }}>Cleveland Rental Property Investing →</div>
            <div style={{ fontSize: 13, color: "#6B7A99" }}>Higher immediate yield than Indianapolis, but with more neighborhood-by-neighborhood risk.</div>
          </a>
          <a href="/guides/columbus-rental-property-investing" style={{
            display: "block", border: "1.5px solid #EBF0FF", borderRadius: 12,
            padding: "16px 20px", textDecoration: "none",
          }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0D1B3E", marginBottom: 4 }}>Columbus Rental Property Investing →</div>
            <div style={{ fontSize: 13, color: "#6B7A99" }}>A similar blend of solid cash flow and real growth, driven by Intel's semiconductor investment.</div>
          </a>
        </div>
        <P>New to DSCR entirely? Our <a href="/guides/dscr-loan-calculator" style={{ color: "#0B5FFF", fontWeight: 700, textDecoration: "none" }}>DSCR loan guide</a> breaks down the formula and what lenders require before you run the numbers on a specific market.</P>

        <div style={{ marginTop: 50, paddingTop: 24, borderTop: "1px solid #EBF0FF", fontSize: 13, color: "#9BA8C0" }}>
          This article is for informational purposes only and is not financial or investment advice. Market conditions, rents, and lending terms change, verify current figures with local property managers and lenders before making an investment decision.
        </div>

        <div style={{ marginTop: 32 }}>
          <div style={{
            background: "#F0F4FF", border: "1.5px solid #D6DFFF", borderRadius: 14,
            padding: "24px 28px", marginBottom: 32, textAlign: "center",
          }}>
            <div style={{ fontSize: 13, color: "#6B7A99", marginBottom: 12, lineHeight: 1.6 }}>
              Put these numbers to work. Try our free rental and DSCR calculators, no account required.
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
