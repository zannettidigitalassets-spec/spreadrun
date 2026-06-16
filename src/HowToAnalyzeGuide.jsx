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
const StepCard = ({ num, title, children, link }) => (
  <div style={{ border: "1px solid #EBF0FF", borderRadius: 14, padding: "26px 28px", margin: "20px 0" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 99, background: "#0B5FFF", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 800, flexShrink: 0,
      }}>{num}</div>
      <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{title}</h3>
    </div>
    <p style={{ fontSize: 15, color: "#3D4F6E", lineHeight: 1.7, margin: "0 0 12px" }}>{children}</p>
    {link && <a href={link.href} style={{ fontSize: 13.5, fontWeight: 700, color: "#0B5FFF", textDecoration: "none" }}>{link.label} →</a>}
  </div>
);

export default function HowToAnalyzeGuide() {
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
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <a href="/guides" style={{ fontSize: 14, fontWeight: 500, color: "#6B7A99", textDecoration: "none" }}>All Guides</a>
          <a href="/app" style={{
            background: "#0B5FFF", color: "#fff", fontSize: 13, fontWeight: 700,
            padding: "8px 18px", borderRadius: 8, textDecoration: "none",
          }}>Try SpreadRun Free →</a>
        </div>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px 40px" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#0B5FFF", textTransform: "uppercase", marginBottom: 14 }}>Guide</div>
        <h1 style={{ fontSize: "clamp(30px, 5vw, 44px)", fontWeight: 900, letterSpacing: "-1px", lineHeight: 1.1, margin: "0 0 20px" }}>
          How to Analyze a Rental Property: A Step-by-Step Guide
        </h1>
        <p style={{ fontSize: 17, color: "#6B7A99", lineHeight: 1.6, margin: "0 0 12px" }}>
          The full underwriting process investors use to evaluate a deal from first look to final offer.
        </p>
        <p style={{ fontSize: 13, color: "#9BA8C0" }}>Updated June 2026 · 9 min read</p>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 100px" }}>
        <P>Every experienced real estate investor follows roughly the same process when evaluating a new property, even if they've never written it down. This guide walks through that process step by step — the order most investors actually work through a deal, from the first glance at a listing to deciding whether to make an offer.</P>

        <SectionTitle>The Five-Step Underwriting Process</SectionTitle>

        <StepCard num="1" title="Pull the basic numbers" link={{ href: "/guides/rental-cash-flow-calculator", label: "Read the cash flow guide" }}>
          Start with the listing price, estimated rent, property taxes, and insurance. These four numbers are usually available before you even see the property in person, and they're enough to do a rough first-pass calculation to decide if it's worth digging further.
        </StepCard>

        <StepCard num="2" title="Calculate cash flow and cap rate" link={{ href: "/guides/good-cap-rate-rental-property", label: "Read the cap rate guide" }}>
          Run the full cash flow calculation, including vacancy, maintenance, and management costs that are easy to forget. Calculate cap rate alongside it so you can compare this property against others in the same market on a level basis. If cash flow is solidly negative at this stage, there's rarely a reason to keep going unless you're underwriting primarily for appreciation.
        </StepCard>

        <StepCard num="3" title="Check your financing qualification" link={{ href: "/guides/dscr-loan-calculator", label: "Read the DSCR guide" }}>
          If you're financing with an investor loan, calculate your DSCR before you get too attached to the deal. A property that cash flows well on paper but doesn't meet a lender's DSCR threshold can fall through during underwriting, costing you time and an inspection fee. Knowing this upfront lets you adjust your down payment or walk away early if needed.
        </StepCard>

        <StepCard num="4" title="Stress-test the assumptions">
          Run the numbers again with slightly worse assumptions — a higher vacancy rate, a lower rent estimate, a higher interest rate. If the deal still works under a moderately pessimistic scenario, that's a strong signal. If it only works under best-case assumptions, the margin for error is too thin.
        </StepCard>

        <StepCard num="5" title="Decide and make your offer">
          If you're rehabbing or flipping rather than holding as a rental, apply the 70% rule to set your maximum offer price. If you're holding long-term, compare the cash-on-cash return against what else you could do with that same capital — including just leaving it in an index fund — to confirm the deal is genuinely worth the time and risk of property ownership.
        </StepCard>
        <div style={{ margin: "20px 0" }}>
          <a href="/guides/70-percent-rule-house-flipping" style={{ fontSize: 13.5, fontWeight: 700, color: "#0B5FFF", textDecoration: "none" }}>Read the 70% rule guide →</a>
        </div>

        <SectionTitle>The Mistake Most New Investors Make</SectionTitle>
        <P>The most common error isn't a math mistake — it's skipping straight from step one to step five. A property looks good based on the listing price and a quick mental estimate of rent, an offer gets made, and only later, sometimes after the offer is accepted, does the real underwriting happen. By then, there's pressure to make the deal work rather than honestly evaluating whether it does.</P>
        <Callout>The fix is simple: do the full underwriting before you fall in love with a property, not after. A property that doesn't pencil out at the listing price either needs a lower offer or isn't the right deal — and it's much easier to walk away from a spreadsheet than from a property you've already pictured yourself owning.</Callout>

        <SectionTitle>Putting It All Together</SectionTitle>
        <P>None of these five steps are individually complicated. The challenge is doing all of them consistently, for every property, especially when you're evaluating several deals a week and the temptation is to shortcut the process on the ones that "feel" promising. The investors who build successful portfolios are usually the ones who run the same disciplined process on every single deal, including the ones that seem obviously good.</P>

        <SectionTitle>Do All Five Steps in One Place</SectionTitle>
        <P>SpreadRun was built around this exact workflow. The Rental Analyzer handles steps one and two, the DSCR Qualifier handles step three, and the Fix & Flip calculator applies the 70% rule for step five — all free, with no spreadsheet required.</P>

        <div style={{ textAlign: "center", margin: "36px 0" }}>
          <a href="/app" style={{
            display: "inline-block", background: "#0B5FFF", color: "#fff",
            fontSize: 15, fontWeight: 700, padding: "15px 32px",
            borderRadius: 12, textDecoration: "none",
          }}>
            Start Analyzing Deals Free →
          </a>
        </div>

        <div style={{ marginTop: 50, paddingTop: 24, borderTop: "1px solid #EBF0FF", fontSize: 13, color: "#9BA8C0" }}>
          This article is for informational purposes only and is not financial advice. Always confirm financing terms and underwriting requirements with a licensed mortgage professional.
        </div>
        <div style={{ marginTop: 32 }}>
          <a href="/" style={{ fontSize: 13, fontWeight: 700, color: "#0B5FFF", textDecoration: "none" }}>← Back to SpreadRun</a>
        </div>
      </div>
    </div>
  );
}
