import { useState, useEffect } from "react";
import { setPageMeta } from "./seo.js";

const formatCurrency = (val) =>
  val === "" || val === undefined || val === null || isNaN(val)
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(val));

const formatPct = (val) =>
  val === null || val === undefined || isNaN(val) ? "—" : `${val.toFixed(2)}%`;

const n_ = (v) => (v === "" || v === undefined || v === null || isNaN(v) ? 0 : Number(v));

const Input = ({ label, prefix, value, onChange, hint }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7A99" }}>{label}</label>
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      {prefix && (
        <span style={{ position: "absolute", left: 12, color: "#6B7A99", fontWeight: 600, fontSize: 14, fontFamily: "'IBM Plex Mono', monospace" }}>{prefix}</span>
      )}
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
        style={{
          width: "100%", padding: prefix ? "10px 12px 10px 28px" : "10px 12px",
          border: "1.5px solid #D6DFFF", borderRadius: 8, fontSize: 14,
          fontFamily: "'IBM Plex Mono', monospace", color: "#0D1B3E",
          background: "#FAFBFF", outline: "none", boxSizing: "border-box",
        }}
        onFocus={e => e.target.style.borderColor = "#0B5FFF"}
        onBlur={e => e.target.style.borderColor = "#D6DFFF"}
      />
    </div>
    {hint && <div style={{ fontSize: 11, color: "#9BA8C0" }}>{hint}</div>}
  </div>
);

const Pill = ({ label, value, highlight }) => (
  <div style={{
    background: highlight ? "#0B5FFF" : "#F0F4FF",
    borderRadius: 10, padding: "18px 22px", flex: 1, minWidth: 140,
  }}>
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: highlight ? "#A8C4FF" : "#6B7A99", marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 800, color: highlight ? "#fff" : "#0D1B3E", fontFamily: "'IBM Plex Mono', monospace" }}>{value}</div>
  </div>
);

const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#0B5FFF", marginBottom: 14, marginTop: 4 }}>{children}</div>
);

const Divider = () => <div style={{ height: 1, background: "#EBF0FF", margin: "20px 0" }} />;

const FAQS = [
  {
    q: "How do you calculate the 70% rule on a fix and flip?",
    a: "The 70% rule formula is: Maximum Allowable Offer = (ARV × 0.70) − Repair Costs. For example, if a property's after-repair value is $300,000 and repairs cost $40,000, the most you should pay is ($300,000 × 0.70) − $40,000 = $170,000. Our calculator shows this automatically alongside your actual profit estimate."
  },
  {
    q: "What is a good ROI for a house flip?",
    a: "Most experienced flippers target a minimum 20% ROI on total project cost (purchase price plus rehab), with net profits of at least $25,000–$30,000 per deal. Lower margins leave too little buffer for cost overruns, delays, or a softer-than-expected sale price. Our calculator flags deals that meet these benchmarks automatically."
  },
  {
    q: "What expenses should I include in a fix and flip analysis?",
    a: "A complete fix and flip analysis should include the purchase price, rehab/renovation costs, holding costs (monthly interest, taxes, insurance, utilities multiplied by your hold period), agent commissions on the sale (typically 5–6% of ARV), and closing costs on the sale (typically 1–2% of ARV). Our calculator includes all of these."
  },
  {
    q: "What is ARV in real estate?",
    a: "ARV stands for After Repair Value — the estimated market value of a property after all planned renovations are complete. It's the foundation of the 70% rule and the most important number in any fix and flip analysis. Getting your ARV wrong is the single biggest reason flippers lose money."
  },
  {
    q: "Can I pay more than the 70% rule allows?",
    a: "Yes, but carefully. Experienced investors sometimes go to 72–75% of ARV in competitive markets or when they have lower financing costs (cash buyers save on hard money interest). The 70% rule is a starting guideline, not an absolute ceiling — but going above it shrinks your margin for error significantly."
  },
];

export default function FlipCalculator() {
  useEffect(() => {
    setPageMeta(
      "Free Fix and Flip Calculator | 70% Rule & Profit Estimator",
      "Calculate your fix and flip profit, ROI, and maximum allowable offer instantly. Includes the 70% rule check, holding costs, agent fees, and closing costs."
    );
  }, []);

  const [flipPurchase, setFlipPurchase] = useState(200000);
  const [rehabCost, setRehabCost] = useState(45000);
  const [arv, setArv] = useState(320000);
  const [holdingMonths, setHoldingMonths] = useState(4);
  const [holdingCostPct, setHoldingCostPct] = useState(1);
  const [agentPct, setAgentPct] = useState(6);
  const [closingCostPct, setClosingCostPct] = useState(2);
  const [openFaq, setOpenFaq] = useState(null);

  const totalIn = n_(flipPurchase) + n_(rehabCost);
  const holdingCosts = (n_(flipPurchase) * n_(holdingCostPct) / 100) * n_(holdingMonths);
  const agentFees = n_(arv) * n_(agentPct) / 100;
  const closingCosts = n_(arv) * n_(closingCostPct) / 100;
  const totalCosts = totalIn + holdingCosts + agentFees + closingCosts;
  const flipProfit = n_(arv) - totalCosts;
  const flipROI = totalIn > 0 ? (flipProfit / totalIn) * 100 : 0;
  const maxAllowable = n_(arv) * 0.7 - n_(rehabCost);
  const flipProfitColor = flipProfit >= 0 ? "#00B67A" : "#E53935";

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: "#0D1B3E", background: "#F5F7FF", minHeight: "100vh" }}>
      <style>{`
        @media (max-width: 640px) {
          .sr-flip-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      {/* NAV */}
      <nav style={{
        background: "#0D1B3E", padding: "0 24px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 6, height: 22, background: "#0B5FFF", borderRadius: 2 }} />
          <span style={{ fontWeight: 800, fontSize: 17, color: "#fff", letterSpacing: "-0.3px" }}>SpreadRun</span>
        </a>
        <a href="/app" style={{
          background: "#0B5FFF", color: "#fff", fontSize: 13, fontWeight: 700,
          padding: "8px 18px", borderRadius: 8, textDecoration: "none",
        }}>Try Full Analyzer →</a>
      </nav>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 16px 80px" }}>
        {/* HEADER */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#0B5FFF", textTransform: "uppercase", marginBottom: 12 }}>Free Tool</div>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, letterSpacing: "-0.8px", margin: "0 0 14px" }}>
            Fix and Flip Profit Calculator
          </h1>
          <p style={{ fontSize: 16, color: "#6B7A99", maxWidth: 580, margin: "0 auto", lineHeight: 1.6 }}>
            Enter your purchase price, rehab costs, and ARV to instantly see your profit, ROI, maximum allowable offer, and whether the deal passes the 70% rule.
          </p>
        </div>

        {/* CALCULATOR */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EBF0FF", padding: "28px 24px", marginBottom: 32 }}>
          {/* Results Pills */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
            <Pill label="Net Profit" value={<span style={{ color: flipProfitColor }}>{formatCurrency(flipProfit)}</span>} highlight />
            <Pill label="ROI" value={<span style={{ color: flipProfit >= 0 ? "#00B67A" : "#E53935" }}>{formatPct(flipROI)}</span>} />
            <Pill label="Max Allowable Offer" value={formatCurrency(maxAllowable)} />
            <Pill label="Total All-In" value={formatCurrency(totalIn)} />
          </div>

          <div className="sr-flip-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Inputs */}
            <div>
              <SectionTitle>Deal Inputs</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Input label="Purchase Price" prefix="$" value={flipPurchase} onChange={setFlipPurchase} />
                <Input label="Rehab / Renovation Cost" prefix="$" value={rehabCost} onChange={setRehabCost} />
                <Input label="After Repair Value (ARV)" prefix="$" value={arv} onChange={setArv} />
              </div>
              <Divider />
              <SectionTitle>Holding & Selling Costs</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Input label="Holding Period (Months)" value={holdingMonths} onChange={setHoldingMonths} />
                <Input label="Monthly Holding Cost %" prefix="%" value={holdingCostPct} onChange={setHoldingCostPct} hint="Interest, utilities, taxes while held" />
                <Input label="Agent Commission %" prefix="%" value={agentPct} onChange={setAgentPct} />
                <Input label="Closing Costs %" prefix="%" value={closingCostPct} onChange={setClosingCostPct} />
              </div>
            </div>

            {/* Results */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#F5F7FF", borderRadius: 12, padding: 20, border: "1px solid #EBF0FF" }}>
                <SectionTitle>Cost Stack</SectionTitle>
                {[
                  ["Purchase Price", flipPurchase],
                  ["Rehab Costs", rehabCost],
                  ["Holding Costs", holdingCosts],
                  ["Agent Fees", agentFees],
                  ["Closing Costs", closingCosts],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #EBF0FF", fontSize: 13 }}>
                    <span style={{ color: "#6B7A99" }}>{k}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>{formatCurrency(v)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 4px", fontSize: 14, fontWeight: 800 }}>
                  <span>Total All-In Cost</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#E53935" }}>{formatCurrency(totalCosts)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 15, fontWeight: 800 }}>
                  <span>Net Profit</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: flipProfitColor }}>{formatCurrency(flipProfit)}</span>
                </div>
              </div>

              <div style={{ background: "#F5F7FF", borderRadius: 12, padding: 20, border: "1px solid #EBF0FF" }}>
                <SectionTitle>70% Rule Check</SectionTitle>
                <div style={{ fontSize: 13, color: "#6B7A99", marginBottom: 12, lineHeight: 1.6 }}>
                  Pay no more than 70% of ARV minus rehab costs.
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                  <span style={{ color: "#6B7A99" }}>Max Allowable Offer</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>{formatCurrency(maxAllowable)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#6B7A99" }}>Your Offer</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: flipPurchase <= maxAllowable ? "#00B67A" : "#E53935" }}>{formatCurrency(flipPurchase)}</span>
                </div>
              </div>

              <div style={{ background: "#F0F4FF", borderRadius: 12, padding: 18, border: "1px solid #D6DFFF" }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#0B5FFF", marginBottom: 8 }}>DEAL SIGNAL</div>
                <div style={{ fontSize: 13, color: "#0D1B3E", lineHeight: 1.6 }}>
                  {flipProfit >= 30000 && flipROI >= 20
                    ? "✅ Strong flip. Profit and ROI both meet investor benchmarks."
                    : flipProfit >= 30000 && flipROI < 20
                    ? "⚠️ Profit looks good but ROI is below the 20% benchmark. Consider reducing purchase price or rehab costs."
                    : flipProfit >= 0 && flipProfit < 30000
                    ? "⚠️ Marginal. Profit exists but leaves little buffer for surprises."
                    : "❌ Losing deal. Reduce purchase price or rehab costs."}
                  {flipPurchase <= maxAllowable ? " Purchase price passes the 70% rule." : " Purchase price exceeds the 70% rule — overpaying."}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ background: "#0D1B3E", borderRadius: 14, padding: "24px 28px", marginBottom: 48, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Need the full deal analysis?</div>
            <div style={{ fontSize: 13, color: "#6B8AAA" }}>SpreadRun also includes a Rental Analyzer and DSCR Qualifier — all free.</div>
          </div>
          <a href="/app#flip" style={{ background: "#0B5FFF", color: "#fff", fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 10, textDecoration: "none", whiteSpace: "nowrap" }}>
            Try Full Analyzer →
          </a>
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.4px", marginBottom: 24 }}>Fix and Flip Calculator: Common Questions</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {FAQS.map((f, i) => (
              <div key={i} style={{ borderBottom: "1px solid #EBF0FF" }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: "100%", textAlign: "left", background: "none", border: "none",
                    padding: "18px 0", cursor: "pointer", display: "flex",
                    justifyContent: "space-between", alignItems: "center",
                    fontSize: 15, fontWeight: 700, color: "#0D1B3E",
                  }}
                >
                  {f.q}
                  <span style={{ fontSize: 18, color: "#0B5FFF", marginLeft: 16, flexShrink: 0 }}>{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && (
                  <div style={{ fontSize: 14, color: "#6B7A99", lineHeight: 1.7, paddingBottom: 18 }}>{f.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 48, textAlign: "center", fontSize: 12, color: "#9BA8C0" }}>
          SpreadRun · Free real estate deal analyzer · <a href="/" style={{ color: "#9BA8C0" }}>spreadrun.com</a> · Not financial advice.
        </div>
      </div>
    </div>
  );
}
