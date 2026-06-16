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

export default function SeventyPercentGuide() {
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
          <a href="/app#flip" style={{
            background: "#0B5FFF", color: "#fff", fontSize: 13, fontWeight: 700,
            padding: "8px 18px", borderRadius: 8, textDecoration: "none",
          }}>Try Fix & Flip Calculator →</a>
        </div>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px 40px" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#0B5FFF", textTransform: "uppercase", marginBottom: 14 }}>Guide</div>
        <h1 style={{ fontSize: "clamp(30px, 5vw, 44px)", fontWeight: 900, letterSpacing: "-1px", lineHeight: 1.1, margin: "0 0 20px" }}>
          The 70% Rule for House Flipping, Explained
        </h1>
        <p style={{ fontSize: 17, color: "#6B7A99", lineHeight: 1.6, margin: "0 0 12px" }}>
          What the 70% rule actually means, how to calculate your maximum allowable offer, and when experienced flippers break the rule on purpose.
        </p>
        <p style={{ fontSize: 13, color: "#9BA8C0" }}>Updated June 2026 · 7 min read</p>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 100px" }}>
        <P>Every house flipper eventually runs into the 70% rule. It's the most widely used quick-screen formula in the flipping world, and for good reason — it gives you a fast way to know whether a deal is even worth digging into further, before you spend hours building out a full budget. This guide breaks down exactly how it works, where it comes from, and when it's smart to deviate from it.</P>

        <SectionTitle>What Is the 70% Rule?</SectionTitle>
        <P>The 70% rule states that an investor should pay no more than 70% of a property's after-repair value (ARV), minus the estimated cost of repairs. The formula is:</P>
        <Callout><strong>Maximum Allowable Offer = (ARV × 0.70) − Estimated Rehab Costs</strong></Callout>
        <P>The remaining 30% of ARV is built-in margin that covers your buying and selling costs, holding costs while the property is being renovated, financing costs, and your actual profit. It's not 30% pure profit — it's a buffer for everything that isn't the purchase price or the rehab budget.</P>

        <SectionTitle>A Worked Example</SectionTitle>
        <P>Say you've found a property with an after-repair value of $400,000, and you estimate the rehab will cost $45,000. Here's how the math works out:</P>
        <Table rows={[
          ["Variable", "Amount"],
          ["After Repair Value (ARV)", "$400,000"],
          ["70% of ARV", "$280,000"],
          ["Estimated Rehab Cost", "-$45,000"],
          ["Maximum Allowable Offer", "$235,000"],
        ]} />
        <P>According to the rule, you shouldn't pay more than $235,000 for this property if you want a comfortable margin once all the buying, holding, and selling costs are factored in. If the seller wants $260,000, the rule says walk away or negotiate — at that price, your margin shrinks to a point where any cost overrun could turn the deal into a loss.</P>

        <SectionTitle>Why 30% as the Buffer?</SectionTitle>
        <P>The 30% margin needs to cover several real costs that are easy to forget when you're focused on the purchase price:</P>
        <P><strong>Holding costs.</strong> Loan interest, property taxes, insurance, and utilities while the property sits unsold during renovation — typically 1% of the purchase price per month it's held.</P>
        <P><strong>Selling costs.</strong> Real estate agent commissions (usually 5-6% of sale price) and closing costs (around 1-2% of sale price).</P>
        <P><strong>Rehab budget overruns.</strong> Almost every renovation costs more than the original estimate. The 30% buffer absorbs some of that risk.</P>
        <P><strong>Actual profit.</strong> After all of the above, whatever's left is the money you actually walk away with.</P>

        <SectionTitle>When to Break the 70% Rule</SectionTitle>
        <P>The 70% rule is a screening tool, not a law of physics. Experienced flippers regularly adjust it based on market conditions and deal specifics:</P>
        <SubTitle>In hot markets with low inventory</SubTitle>
        <P>When good deals are scarce and competition is high, some investors will go to 75% or even 80% of ARV on properties with lower risk — for example, a light cosmetic rehab with a very confident ARV estimate, where the chance of cost overruns is low.</P>
        <SubTitle>On larger, more expensive deals</SubTitle>
        <P>The 70% rule tends to work best on properties in the $150,000 to $400,000 range. On much more expensive properties, the dollar amount of that 30% buffer can be far larger than what's actually needed to cover holding and selling costs, so some investors adjust the percentage upward on high-value flips.</P>
        <SubTitle>On smaller, lower-margin deals</SubTitle>
        <P>On cheaper properties, some investors tighten the rule to 65% or lower, since fixed costs like permits and minimum contractor charges eat up a larger percentage of a smaller deal.</P>

        <SectionTitle>The 70% Rule Has Limits</SectionTitle>
        <P>The biggest weakness of the rule is that it leans entirely on your ARV and rehab cost estimates being accurate. If you overestimate the ARV or underestimate the rehab budget, even a deal that "passes" the 70% rule on paper can still lose money. The rule is a fast filter for deciding which deals deserve a closer look — it's not a substitute for getting real contractor quotes and a solid comparable sales analysis before you commit.</P>

        <SectionTitle>Run the Numbers Instantly</SectionTitle>
        <P>SpreadRun's Fix & Flip calculator applies the 70% rule automatically alongside a full profit and ROI breakdown, including holding costs, agent fees, and closing costs — so you can see in seconds whether a deal clears the bar, and by how much.</P>

        <div style={{ textAlign: "center", margin: "36px 0" }}>
          <a href="/app#flip" style={{
            display: "inline-block", background: "#0B5FFF", color: "#fff",
            fontSize: 15, fontWeight: 700, padding: "15px 32px",
            borderRadius: 12, textDecoration: "none",
          }}>
            Try the Free Fix & Flip Calculator →
          </a>
        </div>

        <div style={{ marginTop: 50, paddingTop: 24, borderTop: "1px solid #EBF0FF", fontSize: 13, color: "#9BA8C0" }}>
          This article is for informational purposes only and is not financial advice. The 70% rule is a general guideline — actual deal economics vary by market, property condition, and financing terms.
        </div>
        <div style={{ marginTop: 32 }}>
          <a href="/" style={{ fontSize: 13, fontWeight: 700, color: "#0B5FFF", textDecoration: "none" }}>← Back to SpreadRun</a>
        </div>
      </div>
    </div>
  );
}
