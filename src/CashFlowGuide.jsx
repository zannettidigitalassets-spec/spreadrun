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

export default function CashFlowGuide() {
  useEffect(() => {
    setPageMeta(PAGE_META.cashFlowGuide.title, PAGE_META.cashFlowGuide.description, PAGE_META.cashFlowGuide.faq);
  }, []);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: "#0D1B3E", background: "#fff" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: '{"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": "What is cash flow in rental real estate?", "acceptedAnswer": {"@type": "Answer", "text": "Cash flow is the money left over each month after collecting rent and paying all expenses including the mortgage, taxes, insurance, maintenance, and property management fees."}}, {"@type": "Question", "name": "What is a good cash flow for a rental property?", "acceptedAnswer": {"@type": "Answer", "text": "Most investors target at least $100-$200 per door per month in net cash flow as a minimum threshold. Strong deals often produce $300-$500/month."}}, {"@type": "Question", "name": "What is cash-on-cash return?", "acceptedAnswer": {"@type": "Answer", "text": "Cash-on-cash return measures your annual cash flow as a percentage of the total cash you invested (down payment plus closing costs). A 8-12% cash-on-cash return is generally considered strong for a rental property."}}, {"@type": "Question", "name": "What expenses should I include in a rental property analysis?", "acceptedAnswer": {"@type": "Answer", "text": "Include mortgage (P&I), property taxes, insurance, maintenance (typically 5-10% of rent), property management (8-10% of rent if using a manager), and vacancy allowance (5-10%)."}}, {"@type": "Question", "name": "What is cap rate and how is it different from cash-on-cash?", "acceptedAnswer": {"@type": "Answer", "text": "Cap rate measures a property\'s income relative to its purchase price, ignoring financing. Cash-on-cash measures your actual return on the cash you put in, including the effect of your mortgage."}}]}' }} />
      <style>{`
        @media (max-width: 760px) {
          .sr-cashflowguide-nav-links-desktop {
            display: none !important;
          }
          .sr-cashflowguide-nav-hamburger {
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

        <div className="sr-cashflowguide-nav-links-desktop" style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <a href="/guides" style={{ fontSize: 14, fontWeight: 500, color: "#6B7A99", textDecoration: "none" }}>All Guides</a>
          <a href="/app#rental" style={{
            background: "#0B5FFF", color: "#fff", fontSize: 13, fontWeight: 700,
            padding: "8px 18px", borderRadius: 8, textDecoration: "none",
          }}>Try Rental Analyzer →</a>
        </div>

        <button
          className="sr-cashflowguide-nav-hamburger"
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
          Rental Property Cash Flow Calculator: A Complete Guide
        </h1>
        <p style={{ fontSize: 17, color: "#6B7A99", lineHeight: 1.6, margin: "0 0 12px" }}>
          How to calculate true monthly cash flow on a rental property, including the expenses new investors most often forget.
        </p>
        <p style={{ fontSize: 13, color: "#9BA8C0" }}>Updated June 2026 · 8 min read</p>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 100px" }}>
        <P>Cash flow is the number that determines whether a rental property actually puts money in your pocket every month, or quietly drains it. It sounds simple, rent minus expenses, but most new investors underestimate their expenses badly enough that a property they thought would cash flow $300 a month actually breaks even or loses money. This guide walks through the full calculation so nothing gets missed.</P>

        <SectionTitle>What Is Cash Flow?</SectionTitle>
        <P>Cash flow is the money left over each month after collecting rent and paying every single expense tied to owning the property, not just the mortgage. The formula looks simple on paper:</P>
        <Callout><strong>Cash Flow = Monthly Rental Income − Monthly Operating Expenses − Mortgage Payment</strong></Callout>
        <P>The catch is in that middle term. "Operating expenses" includes far more than most first-time investors initially budget for, and underestimating it is the single most common reason a deal that looked profitable on a napkin turns out to lose money in reality.</P>

        <SectionTitle>Every Expense That Belongs in the Calculation</SectionTitle>
        <P>Here's the full list lenders, appraisers, and experienced investors use when underwriting a deal properly:</P>
        <Table rows={[
          ["Expense", "Typical Range"],
          ["Mortgage (P&I)", "Based on loan terms"],
          ["Property Taxes", "0.5% – 2.5% of value annually"],
          ["Insurance", "$80 – $200/month"],
          ["Vacancy Reserve", "5% – 8% of rent"],
          ["Maintenance Reserve", "5% – 10% of rent"],
          ["Property Management", "8% – 10% of rent (if used)"],
          ["Capital Expenditures (CapEx)", "5% – 10% of rent"],
          ["HOA Dues (if applicable)", "Varies by property"],
        ]} />
        <P>The two most commonly skipped line items are vacancy reserve and CapEx. Vacancy reserve accounts for the months between tenants when the unit sits empty and generates zero income. CapEx accounts for big, infrequent costs like a new roof, HVAC system, or water heater, expenses that don't happen every month but absolutely will happen eventually, and need to be saved for monthly rather than treated as a surprise.</P>

        <SectionTitle>A Worked Example</SectionTitle>
        <P>Take a property renting for $2,400 per month with a $1,791 monthly mortgage payment (principal and interest). Here's how the full picture looks once every expense is included:</P>
        <Table rows={[
          ["Line Item", "Monthly Amount"],
          ["Gross Rent", "$2,400"],
          ["Vacancy (5%)", "-$120"],
          ["Effective Rent", "$2,280"],
          ["Mortgage (P&I)", "-$1,791"],
          ["Property Taxes", "-$350"],
          ["Insurance", "-$120"],
          ["Maintenance", "-$150"],
          ["Management (8%)", "-$182"],
          ["Net Cash Flow", "-$313"],
        ]} />
        <P>Notice this property is actually losing $313 a month once every real expense is accounted for, even though the rent of $2,400 sounds healthy against a $1,791 mortgage payment on the surface. This is exactly the trap that catches new investors who only check "does rent cover the mortgage" without going further.</P>

        <SectionTitle>Cash Flow vs. Cash-on-Cash Return</SectionTitle>
        <P>Cash flow tells you the dollar amount left over each month. Cash-on-cash return tells you that same number as a percentage of the cash you actually invested, your down payment plus closing costs. A property might only cash flow $150 a month, but if you only put $20,000 down, that's still a meaningful annual return relative to your investment.</P>
        <Callout><strong>Cash-on-Cash Return = (Annual Cash Flow ÷ Total Cash Invested) × 100</strong></Callout>
        <P>Both numbers matter. Cash flow tells you whether the property is sustainable month to month. Cash-on-cash return tells you whether it's a good use of your capital compared to other places you could put that same money.</P>

        <SectionTitle>What Counts as Good Cash Flow?</SectionTitle>
        <P>There's no universal answer, but most experienced investors look for at least $100 to $200 per door in positive monthly cash flow as a baseline cushion, with $200+ considered comfortable. Below that, a single unexpected repair or a month of vacancy can quickly push the property into negative territory for the year.</P>

        <SectionTitle>Calculate It Instantly</SectionTitle>
        <P>Running this math by hand for every property you're considering is tedious, especially when you want to test different down payment amounts or see how the numbers shift if you negotiate the price down. SpreadRun's Rental Analyzer does the full calculation instantly, including vacancy, management, and a live deal signal that tells you whether the numbers are strong, marginal, or a loss.</P>

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
          This article is for informational purposes only and is not financial advice. Actual expenses vary significantly by property, market, and management approach.
        </div>
        <div style={{ marginTop: 32 }}>
          <div style={{
            background: "#F0F4FF", border: "1.5px solid #D6DFFF", borderRadius: 14,
            padding: "24px 28px", marginBottom: 32, textAlign: "center",
          }}>
            <div style={{ fontSize: 13, color: "#6B7A99", marginBottom: 12, lineHeight: 1.6 }}>
              Put these numbers to work. Try our free rental property calculator and get instant cash flow, cap rate, and DSCR results.
            </div>
            <a href="/rental-calculator" style={{
              display: "inline-block", background: "#0B5FFF", color: "#fff",
              fontSize: 14, fontWeight: 700, padding: "12px 28px",
              borderRadius: 10, textDecoration: "none",
            }}>
              👉 Free Rental Calculator (No Sign-Up Required) →
            </a>
          </div>
          <a href="/" style={{ fontSize: 13, fontWeight: 700, color: "#0B5FFF", textDecoration: "none" }}>← Back to SpreadRun</a>
        </div>
      </div>
    </div>
  );
}
