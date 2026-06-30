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

const GaugeBar = ({ label, value, max, color }) => {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7A99", marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: "#0D1B3E" }}>{formatCurrency(value)}/mo</span>
      </div>
      <div style={{ height: 6, background: "#EBF0FF", borderRadius: 99 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99 }} />
      </div>
    </div>
  );
};

const FAQS = [
  {
    q: "How do you calculate rental property cash flow?",
    a: "Cash flow = Effective Rent − All Monthly Expenses. Effective rent is gross rent minus a vacancy allowance (typically 5–8%). Monthly expenses include mortgage (P&I), property taxes, insurance, maintenance (typically 5–10% of rent), property management (8–10% of rent if applicable), and any other costs. What's left is your net monthly cash flow."
  },
  {
    q: "What is a good cash-on-cash return for a rental property?",
    a: "Most investors target 8–12% cash-on-cash return or higher. Below 6% is generally considered thin unless you're in a high-appreciation market where you're banking on long-term equity growth rather than monthly income. Cash-on-cash return is calculated as annual cash flow divided by total cash invested (down payment plus closing costs)."
  },
  {
    q: "What expenses should I include when analyzing a rental property?",
    a: "A complete rental analysis should include: mortgage P&I, property taxes, homeowners insurance, maintenance reserve (typically 1% of purchase price annually or 5–10% of rent), property management fees if applicable (8–10% of rent), vacancy allowance (5–10% of gross rent), and any HOA fees or utilities you cover as the landlord."
  },
  {
    q: "What is cap rate and how do I calculate it?",
    a: "Cap rate = Annual NOI ÷ Purchase Price. NOI (Net Operating Income) is effective rent minus all operating expenses except the mortgage. Cap rate tells you the property's yield independent of how you finance it — useful for comparing properties across different markets. A cap rate above 6% is generally considered healthy for a single-family rental."
  },
  {
    q: "What vacancy rate should I use when analyzing a rental property?",
    a: "Most investors use 5–8% as a conservative vacancy allowance. In strong rental markets with low vacancy, 5% is reasonable. If you're in a softer market, managing the property yourself for the first time, or the property has historically had longer vacancy periods, 8–10% provides a more conservative buffer."
  },
];

export default function RentalCalculator() {
  useEffect(() => {
    setPageMeta(
      "Free Rental Property Calculator | Cash Flow, Cap Rate & DSCR",
      "Calculate rental property cash flow, cap rate, cash-on-cash return, and DSCR instantly. Free rental property analyzer — no account required."
    );
  }, []);

  const [purchasePrice, setPurchasePrice] = useState(350000);
  const [downPct, setDownPct] = useState(25);
  const [interestRate, setInterestRate] = useState(7.25);
  const [loanTermYears, setLoanTermYears] = useState(30);
  const [rent, setRent] = useState(2400);
  const [vacancyPct, setVacancyPct] = useState(5);
  const [taxes, setTaxes] = useState(350);
  const [insurance, setInsurance] = useState(120);
  const [maintenance, setMaintenance] = useState(150);
  const [mgmtPct, setMgmtPct] = useState(8);
  const [otherExpenses, setOtherExpenses] = useState(50);
  const [openFaq, setOpenFaq] = useState(null);

  const downAmount = (n_(purchasePrice) * n_(downPct)) / 100;
  const loanAmount = n_(purchasePrice) - downAmount;
  const monthlyRate = n_(interestRate) / 100 / 12;
  const nMonths = n_(loanTermYears) * 12;
  const mortgage = monthlyRate > 0 && nMonths > 0
    ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, nMonths)) / (Math.pow(1 + monthlyRate, nMonths) - 1)
    : (nMonths > 0 ? loanAmount / nMonths : 0);
  const effectiveRent = n_(rent) * (1 - n_(vacancyPct) / 100);
  const mgmtFee = effectiveRent * (n_(mgmtPct) / 100);
  const totalExpenses = mortgage + n_(taxes) + n_(insurance) + n_(maintenance) + mgmtFee + n_(otherExpenses);
  const noi = effectiveRent - (n_(taxes) + n_(insurance) + n_(maintenance) + mgmtFee + n_(otherExpenses));
  const cashFlow = effectiveRent - totalExpenses;
  const cashOnCash = downAmount > 0 ? (cashFlow * 12 / downAmount) * 100 : 0;
  const capRate = n_(purchasePrice) > 0 ? (noi * 12 / n_(purchasePrice)) * 100 : 0;
  const dscr = mortgage > 0 ? noi / mortgage : 0;
  const grossYield = n_(purchasePrice) > 0 ? (n_(rent) * 12 / n_(purchasePrice)) * 100 : 0;
  const cashFlowColor = cashFlow >= 0 ? "#00B67A" : "#E53935";

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: "#0D1B3E", background: "#F5F7FF", minHeight: "100vh" }}>
      <style>{`
        @media (max-width: 640px) {
          .sr-rental-grid {
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
            Rental Property Cash Flow Calculator
          </h1>
          <p style={{ fontSize: 16, color: "#6B7A99", maxWidth: 580, margin: "0 auto", lineHeight: 1.6 }}>
            Enter your property details to instantly calculate monthly cash flow, cash-on-cash return, cap rate, and DSCR. Free, no account required.
          </p>
        </div>

        {/* CALCULATOR */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EBF0FF", padding: "28px 24px", marginBottom: 32 }}>
          {/* Results Pills */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
            <Pill label="Monthly Cash Flow" value={<span style={{ color: cashFlowColor }}>{formatCurrency(cashFlow)}</span>} highlight />
            <Pill label="Cash-on-Cash" value={formatPct(cashOnCash)} />
            <Pill label="Cap Rate" value={formatPct(capRate)} />
            <Pill label="DSCR" value={dscr.toFixed(2)} />
          </div>

          <div className="sr-rental-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Inputs */}
            <div>
              <SectionTitle>Property & Loan</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Input label="Purchase Price" prefix="$" value={purchasePrice} onChange={setPurchasePrice} />
                <Input label="Down Payment %" prefix="%" value={downPct} onChange={setDownPct} hint={`Down: ${formatCurrency(downAmount)} · Loan: ${formatCurrency(loanAmount)}`} />
                <Input label="Interest Rate %" prefix="%" value={interestRate} onChange={setInterestRate} />
                <Input label="Loan Term (Years)" value={loanTermYears} onChange={setLoanTermYears} />
              </div>
              <Divider />
              <SectionTitle>Income</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Input label="Monthly Rent" prefix="$" value={rent} onChange={setRent} />
                <Input label="Vacancy Rate %" prefix="%" value={vacancyPct} onChange={setVacancyPct} hint={`Effective rent: ${formatCurrency(effectiveRent)}/mo`} />
              </div>
              <Divider />
              <SectionTitle>Monthly Expenses</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Input label="Property Taxes" prefix="$" value={taxes} onChange={setTaxes} />
                <Input label="Insurance" prefix="$" value={insurance} onChange={setInsurance} />
                <Input label="Maintenance" prefix="$" value={maintenance} onChange={setMaintenance} />
                <Input label="Property Mgmt %" prefix="%" value={mgmtPct} onChange={setMgmtPct} hint={`Fee: ${formatCurrency(mgmtFee)}/mo`} />
                <Input label="Other" prefix="$" value={otherExpenses} onChange={setOtherExpenses} />
              </div>
            </div>

            {/* Results */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#F5F7FF", borderRadius: 12, padding: 20, border: "1px solid #EBF0FF" }}>
                <SectionTitle>Monthly Breakdown</SectionTitle>
                <GaugeBar label="Mortgage (P&I)" value={mortgage} max={effectiveRent} color="#0B5FFF" />
                <GaugeBar label="Taxes" value={taxes} max={effectiveRent} color="#6B9BFF" />
                <GaugeBar label="Insurance" value={insurance} max={effectiveRent} color="#93B4FF" />
                <GaugeBar label="Maintenance" value={maintenance} max={effectiveRent} color="#B8CCFF" />
                <GaugeBar label="Mgmt Fee" value={mgmtFee} max={effectiveRent} color="#D4E1FF" />
                <Divider />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
                  <span style={{ color: "#6B7A99" }}>Total Expenses</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#E53935" }}>{formatCurrency(totalExpenses)}/mo</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 800, marginTop: 8 }}>
                  <span>Net Cash Flow</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: cashFlowColor }}>{formatCurrency(cashFlow)}/mo</span>
                </div>
              </div>

              <div style={{ background: "#F5F7FF", borderRadius: 12, padding: 20, border: "1px solid #EBF0FF" }}>
                <SectionTitle>Return Metrics</SectionTitle>
                {[
                  ["Gross Rent Yield", formatPct(grossYield)],
                  ["Cap Rate (NOI basis)", formatPct(capRate)],
                  ["Cash-on-Cash Return", formatPct(cashOnCash)],
                  ["DSCR", dscr.toFixed(2)],
                  ["Annual Cash Flow", formatCurrency(cashFlow * 12)],
                  ["Total Cash Invested", formatCurrency(downAmount)],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #EBF0FF", fontSize: 13 }}>
                    <span style={{ color: "#6B7A99" }}>{k}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>{v}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: "#F0F4FF", borderRadius: 12, padding: 18, border: "1px solid #D6DFFF" }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#0B5FFF", marginBottom: 8 }}>DEAL SIGNAL</div>
                <div style={{ fontSize: 13, color: "#0D1B3E", lineHeight: 1.6 }}>
                  {cashFlow >= 200 && capRate >= 6
                    ? "✅ Strong deal. Positive cash flow with a healthy cap rate above 6%."
                    : cashFlow >= 0 && cashFlow < 200
                    ? "⚠️ Marginally cash flowing. Thin margin — consider negotiating price or reducing expenses."
                    : "❌ Negative cash flow. This deal loses money monthly at current inputs."}
                  {dscr >= 1.25 ? " DSCR qualifies for most investor loans." : dscr > 0 ? ` DSCR of ${dscr.toFixed(2)} is below lender minimum of 1.25.` : ""}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ background: "#0D1B3E", borderRadius: 14, padding: "24px 28px", marginBottom: 48, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Need the full deal analysis?</div>
            <div style={{ fontSize: 13, color: "#6B8AAA" }}>SpreadRun also includes a Fix & Flip Calculator and DSCR Qualifier — all free.</div>
          </div>
          <a href="/app#rental" style={{ background: "#0B5FFF", color: "#fff", fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 10, textDecoration: "none", whiteSpace: "nowrap" }}>
            Try Full Analyzer →
          </a>
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.4px", marginBottom: 24 }}>Rental Property Calculator: Common Questions</h2>
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
