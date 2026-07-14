import { useState, useEffect } from "react";
import { setPageMeta } from "./seo.js";

const SectionTitle = ({ children }) => (
  <h2 style={{ fontSize: 24, fontWeight: 800, margin: "40px 0 16px", letterSpacing: "-0.4px" }}>{children}</h2>
);

const P = ({ children }) => (
  <p style={{ fontSize: 15.5, color: "#3D4F6E", lineHeight: 1.75, margin: "0 0 18px" }}>{children}</p>
);

const TermCard = ({ term, abbr, children, link }) => (
  <div style={{ border: "1px solid #EBF0FF", borderRadius: 12, padding: "20px 24px", marginBottom: 12 }}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
      <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: "#0D1B3E" }}>{term}</h3>
      {abbr && (
        <span style={{
          fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
          color: "#0B5FFF", background: "#EEF3FF", padding: "2px 9px", borderRadius: 99,
        }}>{abbr}</span>
      )}
    </div>
    <p style={{ fontSize: 14.5, color: "#3D4F6E", lineHeight: 1.7, margin: link ? "0 0 10px" : 0 }}>{children}</p>
    {link && (
      <a href={link.href} style={{ fontSize: 13, fontWeight: 700, color: "#0B5FFF", textDecoration: "none" }}>
        {link.label} →
      </a>
    )}
  </div>
);

export default function TermsGlossary() {
  useEffect(() => {
    setPageMeta(
      "Real Estate Investing Terms Glossary: DSCR, ARV, Cap Rate & More | SpreadRun",
      "Plain-English definitions for every real estate investing term you'll actually run into, from DSCR and ARV to cap rate, PITI, and the 70% rule.",
      "/guides/real-estate-terms-glossary"
    );
  }, []);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: "#0D1B3E", background: "#fff" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          { "@type": "Question", "name": "What does DSCR stand for?", "acceptedAnswer": { "@type": "Answer", "text": "DSCR stands for Debt Service Coverage Ratio. It measures how much rental income a property generates relative to its mortgage payment, and it's the number lenders use to qualify investor loans instead of personal income." } },
          { "@type": "Question", "name": "What does ARV mean in real estate?", "acceptedAnswer": { "@type": "Answer", "text": "ARV stands for After Repair Value, the estimated market value of a property once planned renovations are complete. It's the foundation of the 70% rule used in fix and flip investing." } },
          { "@type": "Question", "name": "What is PITI?", "acceptedAnswer": { "@type": "Answer", "text": "PITI stands for Principal, Interest, Taxes, and Insurance, the four components that make up a full monthly mortgage payment. Lenders use PITI rather than just principal and interest because taxes and insurance are real ongoing costs." } },
          { "@type": "Question", "name": "What does BRRRR mean?", "acceptedAnswer": { "@type": "Answer", "text": "BRRRR stands for Buy, Rehab, Rent, Refinance, Repeat. It's a strategy where an investor buys a distressed property, fixes it up, rents it out, refinances based on the new higher value to pull cash back out, and repeats the process on another property." } },
          { "@type": "Question", "name": "What is a good LTV for an investment property?", "acceptedAnswer": { "@type": "Answer", "text": "LTV stands for Loan-to-Value ratio, the loan amount divided by the property's value. Investment properties typically require a lower LTV (meaning a larger down payment) than primary residences, often 70-80% LTV compared to 80-97% for owner-occupied homes." } },
        ],
      }) }} />
      <style>{`
        @media (max-width: 760px) {
          .sr-termsguide-nav-links-desktop {
            display: none !important;
          }
          .sr-termsguide-nav-hamburger {
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

        <div className="sr-termsguide-nav-links-desktop" style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <a href="/guides" style={{ fontSize: 14, fontWeight: 500, color: "#6B7A99", textDecoration: "none" }}>All Guides</a>
          <a href="/app" style={{
            background: "#0B5FFF", color: "#fff", fontSize: 13, fontWeight: 700,
            padding: "8px 18px", borderRadius: 8, textDecoration: "none",
          }}>Try SpreadRun Free →</a>
        </div>

        <button
          className="sr-termsguide-nav-hamburger"
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
              href="/app"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: "block", textAlign: "center", marginTop: 20,
                background: "#0B5FFF", color: "#fff", fontSize: 15, fontWeight: 700,
                padding: "14px", borderRadius: 10, textDecoration: "none",
              }}
            >
              Try SpreadRun Free →
            </a>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px 40px" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#0B5FFF", textTransform: "uppercase", marginBottom: 14 }}>Glossary</div>
        <h1 style={{ fontSize: "clamp(30px, 5vw, 44px)", fontWeight: 900, letterSpacing: "-1px", lineHeight: 1.1, margin: "0 0 20px" }}>
          Real Estate Investing Terms, Explained
        </h1>
        <p style={{ fontSize: 17, color: "#6B7A99", lineHeight: 1.6, margin: "0 0 12px" }}>
          Every abbreviation and term that shows up constantly in real estate investing, explained in plain English, with no finance degree required.
        </p>
        <p style={{ fontSize: 13, color: "#9BA8C0" }}>Updated July 2026 · Reference guide</p>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 100px" }}>

        <P>If you've spent any time on real estate investing forums, you've seen posts full of terms and acronyms that get thrown around like everyone already knows what they mean. DSCR, ARV, PITI, LTV, NOI, it's a genuine wall of jargon when you're starting out. This page breaks down the terms that actually matter, the ones you'll run into constantly once you start analyzing deals.</P>

        <SectionTitle>Financing & Loan Terms</SectionTitle>

        <TermCard term="DSCR" abbr="Debt Service Coverage Ratio" link={{ href: "/guides/dscr-loan-calculator", label: "Read the full DSCR guide" }}>
          The number lenders use to decide if a rental property qualifies for an investor loan, based on the property's own income rather than your personal salary. Divide monthly rent by the monthly mortgage payment (PITI). A ratio above 1.25 is what most lenders want to see for their best rates.
        </TermCard>

        <TermCard term="PITI" abbr="Principal, Interest, Taxes, Insurance">
          The four pieces that make up a full monthly mortgage payment. A lot of first-time investors only budget for principal and interest and forget that taxes and insurance are real, ongoing costs that get added on top every month.
        </TermCard>

        <TermCard term="LTV" abbr="Loan-to-Value">
          The loan amount divided by the property's value, expressed as a percentage. If you put 25% down, your LTV is 75%. Investment properties usually require a lower LTV (bigger down payment) than a primary home, often 70-80% compared to as high as 97% for owner-occupied purchases.
        </TermCard>

        <TermCard term="DTI" abbr="Debt-to-Income Ratio">
          Your total monthly debt payments divided by your gross monthly income. This matters for conventional loans, where the lender is qualifying you personally. It's the opposite of DSCR loans, which qualify the property instead of you.
        </TermCard>

        <TermCard term="Seasoning">
          The waiting period a lender requires you to own a property before they'll approve a cash-out refinance based on its current value rather than what you originally paid. Typically 6 months, though it varies by lender and loan type.
        </TermCard>

        <SectionTitle>Deal Analysis Terms</SectionTitle>

        <TermCard term="Cap Rate" abbr="Capitalization Rate" link={{ href: "/guides/good-cap-rate-rental-property", label: "Read the full cap rate guide" }}>
          A property's annual income as a percentage of its price, completely ignoring how it's financed. Divide annual net operating income by the purchase price. Useful for comparing properties in the same market on an apples-to-apples basis.
        </TermCard>

        <TermCard term="NOI" abbr="Net Operating Income">
          A property's annual income after operating expenses (taxes, insurance, maintenance, management), but before the mortgage payment. This is the number cap rate is built on.
        </TermCard>

        <TermCard term="Cash-on-Cash Return" link={{ href: "/guides/rental-cash-flow-calculator", label: "Read the full cash flow guide" }}>
          Your annual cash flow divided by the actual cash you invested, your down payment plus closing costs. This tells you your real return on the money you put in, unlike cap rate, which ignores financing entirely.
        </TermCard>

        <TermCard term="Cash Flow">
          The money left over each month after collecting rent and paying every expense, including the mortgage. Positive cash flow means the property makes money. Negative means it costs you money out of pocket every month.
        </TermCard>

        <TermCard term="CapEx" abbr="Capital Expenditures">
          Big, infrequent costs like a new roof, HVAC system, or water heater. These don't happen every month, but they will happen eventually, and experienced investors budget a small monthly reserve for them rather than getting surprised later.
        </TermCard>

        <TermCard term="Vacancy Rate">
          The percentage of time a rental unit sits empty between tenants, factored into your cash flow calculation as lost income. Most investors budget 5-10% depending on the market.
        </TermCard>

        <SectionTitle>Fix & Flip Terms</SectionTitle>

        <TermCard term="ARV" abbr="After Repair Value" link={{ href: "/guides/70-percent-rule-house-flipping", label: "Read the full 70% rule guide" }}>
          The estimated market value of a property once all planned renovations are complete. This is the single most important number in a flip analysis, since the entire 70% rule is built on getting this estimate right.
        </TermCard>

        <TermCard term="MAO" abbr="Maximum Allowable Offer">
          The highest price a flipper should pay for a property, calculated as 70% of ARV minus estimated rehab costs. It's the practical output of the 70% rule.
        </TermCard>

        <TermCard term="70% Rule" link={{ href: "/guides/70-percent-rule-house-flipping", label: "Read the full 70% rule guide" }}>
          A quick screening formula for fix and flip deals: pay no more than 70% of ARV minus rehab costs. The remaining 30% covers holding costs, selling costs, cost overruns, and your actual profit.
        </TermCard>

        <SectionTitle>Strategy Terms</SectionTitle>

        <TermCard term="BRRRR" abbr="Buy, Rehab, Rent, Refinance, Repeat">
          A strategy where you buy a distressed property below market value, renovate it, rent it out, then refinance based on the new higher value to pull your original cash back out, freeing it up to repeat the process on another property.
        </TermCard>

        <TermCard term="Turnkey">
          A property that's already renovated, tenanted, and ready to generate rental income immediately, often sold by companies specializing in out-of-state investor purchases. Convenient, but usually priced at a premium compared to finding and rehabbing a deal yourself.
        </TermCard>

        <TermCard term="1031 Exchange">
          A tax provision that lets an investor defer capital gains taxes by rolling the proceeds from a sold property directly into a new "like-kind" property, as long as strict timelines are followed (45 days to identify a replacement, 180 days to close).
        </TermCard>

        <TermCard term="Rent-to-Price Ratio">
          A property's monthly rent as a fraction of its purchase price, usually expressed as the price divided by rent. A lower number is better for cash flow. Strong cash-flow markets often run 90-145, while pricier markets can run 200 or higher.
        </TermCard>

        <SectionTitle>Still Have a Question?</SectionTitle>
        <P>This list covers the terms that come up constantly, but real estate has more jargon than any single page can hold. If there's a term you keep running into and can't find a straight answer on, the best move is usually to just plug your actual numbers into a calculator and see what the output tells you, the math will make the concept click faster than any definition can.</P>

        <div style={{ textAlign: "center", margin: "36px 0" }}>
          <a href="/app" style={{
            display: "inline-block", background: "#0B5FFF", color: "#fff",
            fontSize: 15, fontWeight: 700, padding: "15px 32px",
            borderRadius: 12, textDecoration: "none",
          }}>
            Try SpreadRun Free →
          </a>
        </div>

        <div style={{ marginTop: 50, paddingTop: 24, borderTop: "1px solid #EBF0FF", fontSize: 13, color: "#9BA8C0" }}>
          This glossary is for informational purposes only and is not financial or legal advice. Terms and typical ranges can vary by lender, market, and loan program.
        </div>

        <div style={{ marginTop: 32 }}>
          <div style={{
            background: "#F0F4FF", border: "1.5px solid #D6DFFF", borderRadius: 14,
            padding: "24px 28px", marginBottom: 32, textAlign: "center",
          }}>
            <div style={{ fontSize: 13, color: "#6B7A99", marginBottom: 12, lineHeight: 1.6 }}>
              Ready to put these terms into practice? Try our free calculators, no account required.
            </div>
            <a href="/guides" style={{
              display: "inline-block", background: "#0B5FFF", color: "#fff",
              fontSize: 14, fontWeight: 700, padding: "12px 28px",
              borderRadius: 10, textDecoration: "none",
            }}>
              Browse All Guides →
            </a>
          </div>
          <a href="/" style={{ fontSize: 13, fontWeight: 700, color: "#0B5FFF", textDecoration: "none" }}>← Back to SpreadRun</a>
        </div>
      </div>
    </div>
  );
}
