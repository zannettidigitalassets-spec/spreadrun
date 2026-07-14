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

export default function ColumbusGuide() {
  useEffect(() => {
    setPageMeta(
      "Columbus Rental Property Investing: DSCR Loans & Cash Flow Guide | SpreadRun",
      "A real numbers breakdown of investing in Columbus, Ohio rental properties: rent-to-price ratios, DSCR loan qualification, and why population growth sets it apart.",
      "/guides/columbus-rental-property-investing"
    );
  }, []);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: "#0D1B3E", background: "#fff" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          { "@type": "Question", "name": "Is Columbus, Ohio a good market for rental property investing?", "acceptedAnswer": { "@type": "Answer", "text": "Columbus is consistently rated among the top Midwest markets for real estate investors, combining strong rental yields (typically 9-11%) with genuine population growth driven by Intel's semiconductor investment, Ohio State University, and a diversifying tech and logistics sector." } },
          { "@type": "Question", "name": "What is the average rent in Columbus, Ohio?", "acceptedAnswer": { "@type": "Answer", "text": "Average rents in the Columbus metro typically range from $1,300-1,700 depending on property type and neighborhood, with steady upward pressure from continued population inflow." } },
          { "@type": "Question", "name": "Can I get a DSCR loan for a Columbus rental property?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Columbus's rent-to-price ratios support DSCR financing well, which qualifies based on the property's rental income rather than personal income. Most lenders want to see a DSCR of at least 1.25 at purchase for the best rate tiers." } },
          { "@type": "Question", "name": "How does the Intel investment affect Columbus real estate?", "acceptedAnswer": { "@type": "Answer", "text": "Intel's semiconductor manufacturing investment near Columbus (New Albany) is projected to bring tens of thousands of direct and indirect jobs to the region over the coming decade, which is driving sustained population and rental demand growth well beyond the typical Midwest market pace." } },
          { "@type": "Question", "name": "Which Columbus neighborhoods are best for rental investing?", "acceptedAnswer": { "@type": "Answer", "text": "Areas near Ohio State University support strong, stable student and young professional rental demand. Suburbs closer to the Intel development corridor in New Albany and Licking County are also drawing early investor interest as that project ramps up hiring." } },
        ],
      }) }} />
      <style>{`
        @media (max-width: 760px) {
          .sr-columbusguide-nav-links-desktop {
            display: none !important;
          }
          .sr-columbusguide-nav-hamburger {
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

        <div className="sr-columbusguide-nav-links-desktop" style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <a href="/guides" style={{ fontSize: 14, fontWeight: 500, color: "#6B7A99", textDecoration: "none" }}>All Guides</a>
          <a href="/app#dscr" style={{
            background: "#0B5FFF", color: "#fff", fontSize: 13, fontWeight: 700,
            padding: "8px 18px", borderRadius: 8, textDecoration: "none",
          }}>Try DSCR Calculator →</a>
        </div>

        <button
          className="sr-columbusguide-nav-hamburger"
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
          Columbus Rental Property Investing: A Real Numbers Guide
        </h1>
        <p style={{ fontSize: 17, color: "#6B7A99", lineHeight: 1.6, margin: "0 0 12px" }}>
          Why Columbus combines strong cash flow with genuine population growth, and how Intel's semiconductor investment is reshaping the region's rental demand.
        </p>
        <p style={{ fontSize: 13, color: "#9BA8C0" }}>Updated July 2026 · 8 min read</p>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 100px" }}>

        <P>Columbus rarely gets the same national attention as Austin or Nashville, but it consistently ranks among the strongest Midwest rental markets for a simple reason: it combines the cash-flow advantages of Ohio's low cost basis with a genuine, ongoing population growth story that most cash-flow markets can't match.</P>

        <SectionTitle>The Cash Flow Fundamentals</SectionTitle>
        <P>Like Cleveland and Indianapolis, Columbus benefits from Ohio's relatively low effective property tax rates (typically 0.4-0.9%) and a purchase price that remains well below coastal and Sun Belt markets. Rental yields in the 9-11% range are common, putting Columbus in the same cash-flow tier as Cleveland while offering meaningfully stronger long-term growth fundamentals.</P>
        <Table rows={[
          ["Metric", "Approximate Value"],
          ["Typical rental yield", "9% – 11%"],
          ["Effective property tax rate", "0.4% – 0.9%"],
          ["Average rent (metro)", "$1,300 – $1,700"],
          ["Typical rent-to-price ratio", "100 – 150"],
        ]} />

        <SectionTitle>Why Columbus Is Different: The Intel Effect</SectionTitle>
        <P>What sets Columbus apart from most Midwest cash-flow markets is a single, massive catalyst: Intel's semiconductor manufacturing investment in nearby New Albany. This is one of the largest single private investments in Ohio history, and it's projected to bring tens of thousands of direct and indirect jobs to the region over the next decade as the fabs ramp up production and the surrounding supply chain builds out.</P>
        <Callout>
          <strong>Why this matters for investors:</strong> most Midwest cash-flow markets are stable but not growing dramatically. Columbus has both: strong current yields plus a real, identifiable growth catalyst that's already visibly reshaping demand in the New Albany and Licking County corridor.
        </Callout>
        <P>This kind of catalyst-driven growth is rare in Midwest secondary markets, and it's part of why Columbus increasingly shows up alongside faster-growing Sun Belt metros in national investor rankings, despite having a fundamentally different (and more affordable) cost basis.</P>

        <SectionTitle>Best Areas for Rental Investing</SectionTitle>
        <P>Neighborhoods near Ohio State University support consistently strong rental demand from students and young professionals, a stable, renewable tenant pool that many college markets envy. For investors looking at the Intel growth story specifically, the New Albany and broader Licking County corridor is drawing early investor interest, though it's worth noting this is still an emerging thesis rather than a proven track record the way OSU-adjacent rentals are.</P>
        <P>More established, lower-risk cash flow tends to concentrate in solid working-class and middle-income neighborhoods throughout the broader metro, similar in character to Indianapolis's Class B areas.</P>

        <SectionTitle>Financing a Columbus Rental With a DSCR Loan</SectionTitle>
        <P>Columbus's rent-to-price profile makes it well-suited to DSCR financing, which qualifies based on the property's rental income rather than personal income verification. Here's a representative example:</P>
        <Table rows={[
          ["Input", "Example Value"],
          ["Purchase price", "$245,000"],
          ["Loan amount (75% LTV)", "$183,750"],
          ["Monthly rent", "$1,650"],
          ["Est. monthly PITI", "$1,320"],
          ["DSCR", "1.25"],
        ]} />
        <P>A 1.25 DSCR here sits at the strong-qualifying threshold most lenders target for their best rate tiers, giving reasonable cushion for vacancy and unexpected repairs.</P>

        <SectionTitle>What to Watch Before You Buy</SectionTitle>
        <P><strong>Distinguish between the established base and the growth story.</strong> OSU-adjacent rentals and established metro neighborhoods have a long, proven track record. The Intel-driven growth corridor is real but newer, treat it as a genuine upside catalyst, not a guaranteed near-term windfall.</P>
        <P><strong>Verify rent estimates against actual local comps</strong>, not metro-wide averages, since Columbus spans a wide range of submarkets with meaningfully different rent profiles.</P>
        <P><strong>Budget realistically for maintenance</strong> on older housing stock in established neighborhoods, similar to other Midwest markets. 8-10% of rent is a reasonable conservative baseline.</P>

        <SectionTitle>Run the Numbers on Your Columbus Deal</SectionTitle>
        <P>Whether you're looking at an established rental near OSU or an early-stage opportunity in the Intel growth corridor, the same core numbers determine whether a deal works. SpreadRun's calculators let you plug in your actual purchase price, financing terms, and rent estimate to see cash flow, cap rate, and DSCR instantly.</P>

        <div style={{ textAlign: "center", margin: "36px 0" }}>
          <a href="/app#dscr" style={{
            display: "inline-block", background: "#0B5FFF", color: "#fff",
            fontSize: 15, fontWeight: 700, padding: "15px 32px",
            borderRadius: 12, textDecoration: "none",
          }}>
            Try the Free DSCR Calculator →
          </a>
        </div>

        <SectionTitle>Other Ohio and Midwest Markets</SectionTitle>
        <P>Columbus shares Ohio's tax advantages with Cleveland, and a similar buyer-friendly profile to Indianapolis. Worth comparing all three before committing to a specific market:</P>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          <a href="/guides/cleveland-rental-property-investing" style={{
            display: "block", border: "1.5px solid #EBF0FF", borderRadius: 12,
            padding: "16px 20px", textDecoration: "none",
          }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0D1B3E", marginBottom: 4 }}>Cleveland Rental Property Investing →</div>
            <div style={{ fontSize: 13, color: "#6B7A99" }}>The same Ohio property tax advantages, with a higher pure cash-flow yield but more neighborhood-specific risk.</div>
          </a>
          <a href="/guides/indianapolis-rental-property-investing" style={{
            display: "block", border: "1.5px solid #EBF0FF", borderRadius: 12,
            padding: "16px 20px", textDecoration: "none",
          }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0D1B3E", marginBottom: 4 }}>Indianapolis Rental Property Investing →</div>
            <div style={{ fontSize: 13, color: "#6B7A99" }}>Rated the most buyer-friendly market nationally, with a similarly balanced cash-flow-plus-growth profile.</div>
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
