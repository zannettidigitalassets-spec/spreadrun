import { useState, useEffect } from "react";
import { setPageMeta } from "./seo.js";

const formatCurrency = (val) =>
  val === "" || val === undefined || val === null || isNaN(val)
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(val));

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
    q: "What is a good DSCR ratio for a rental property?",
    a: "Most lenders require a minimum DSCR of 1.25, meaning the gross rent must be at least 125% of the monthly PITI payment. A ratio of 1.0–1.19 may qualify with some lenders at higher rates. Above 1.25 is considered strong and typically qualifies for the best available rates."
  },
  {
    q: "How do you calculate DSCR on a rental property?",
    a: "DSCR = Monthly Gross Rent ÷ Monthly PITI (Principal, Interest, Taxes, Insurance). For example, if rent is $2,400 and PITI is $1,920, the DSCR is 1.25 — right at the standard qualifying threshold for most investor loan programs."
  },
  {
    q: "Do DSCR loans require income verification?",
    a: "No. DSCR loans qualify based on the property's rental income, not your personal W-2 income or tax returns. This makes them especially popular with self-employed investors or those with multiple properties whose personal income doesn't reflect their actual investment performance."
  },
  {
    q: "What happens if my DSCR is below 1.25?",
    a: "If your DSCR is below 1.25, you have several options: increase the down payment to reduce the loan amount and lower monthly payments, negotiate a lower purchase price, shop for a lower interest rate, or find a property with higher achievable rent. Our calculator shows exactly how much rent you need to hit the 1.25 benchmark."
  },
  {
    q: "What is PITI in a DSCR calculation?",
    a: "PITI stands for Principal, Interest, Taxes, and Insurance — the four components of a full monthly mortgage payment. Lenders use PITI rather than just the P&I payment because taxes and insurance are real ongoing costs that affect a property's ability to service its debt."
  },
];

export default function DscrCalculator() {
  useEffect(() => {
    setPageMeta(
      "Free DSCR Calculator | Debt Service Coverage Ratio Tool",
      "Calculate your DSCR ratio instantly. See if your rental property qualifies for investor financing and exactly how much rent you need to hit the 1.25 benchmark."
    );
  }, []);

  const [dscrRent, setDscrRent] = useState(2400);
  const [dscrLoanAmount, setDscrLoanAmount] = useState(262500);
  const [dscrRate, setDscrRate] = useState(7.5);
  const [dscrTerm, setDscrTerm] = useState(30);
  const [dscrTaxes, setDscrTaxes] = useState(350);
  const [dscrInsurance, setDscrInsurance] = useState(120);
  const [openFaq, setOpenFaq] = useState(null);

  const dscrMonthlyRate = n_(dscrRate) / 100 / 12;
  const dscrN = n_(dscrTerm) * 12;
  const dscrPayment = dscrMonthlyRate > 0 && dscrN > 0
    ? n_(dscrLoanAmount) * (dscrMonthlyRate * Math.pow(1 + dscrMonthlyRate, dscrN)) / (Math.pow(1 + dscrMonthlyRate, dscrN) - 1)
    : (dscrN > 0 ? n_(dscrLoanAmount) / dscrN : 0);
  const dscrPITI = dscrPayment + n_(dscrTaxes) + n_(dscrInsurance);
  const dscrRatio = dscrPITI > 0 ? n_(dscrRent) / dscrPITI : 0;
  const dscrQualifies = dscrRatio >= 1.25;
  const minRentNeeded = dscrPITI * 1.25;

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: "#0D1B3E", background: "#F5F7FF", minHeight: "100vh" }}>
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
            Debt Service Coverage Ratio (DSCR) Calculator
          </h1>
          <p style={{ fontSize: 16, color: "#6B7A99", maxWidth: 580, margin: "0 auto", lineHeight: 1.6 }}>
            Enter your loan details and expected rent to instantly see your DSCR ratio, whether you qualify for investor financing, and exactly how much rent you need to hit the 1.25 benchmark.
          </p>
        </div>

        {/* CALCULATOR */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EBF0FF", padding: "28px 24px", marginBottom: 32 }}>
          {/* Results Pills */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
            <Pill label="DSCR Ratio" value={<span style={{ color: dscrQualifies ? "#00B67A" : "#E53935" }}>{dscrRatio.toFixed(2)}</span>} highlight />
            <Pill label="Monthly PITI" value={formatCurrency(dscrPITI)} />
            <Pill label="Min Rent Needed" value={formatCurrency(minRentNeeded)} />
            <Pill label="Status" value={dscrQualifies ? "✅ Qualifies" : "❌ Does Not"} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Inputs */}
            <div>
              <SectionTitle>Loan Details</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Input label="Loan Amount" prefix="$" value={dscrLoanAmount} onChange={setDscrLoanAmount} />
                <Input label="Interest Rate %" prefix="%" value={dscrRate} onChange={setDscrRate} />
                <Input label="Loan Term (Years)" value={dscrTerm} onChange={setDscrTerm} />
              </div>
              <Divider />
              <SectionTitle>Monthly Income & Costs</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Input label="Monthly Gross Rent" prefix="$" value={dscrRent} onChange={setDscrRent} />
                <Input label="Monthly Property Taxes" prefix="$" value={dscrTaxes} onChange={setDscrTaxes} />
                <Input label="Monthly Insurance" prefix="$" value={dscrInsurance} onChange={setDscrInsurance} />
              </div>
            </div>

            {/* Results */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#F5F7FF", borderRadius: 12, padding: 20, border: "1px solid #EBF0FF" }}>
                <SectionTitle>DSCR Breakdown</SectionTitle>
                {[
                  ["Principal & Interest", formatCurrency(dscrPayment)],
                  ["Taxes", formatCurrency(dscrTaxes)],
                  ["Insurance", formatCurrency(dscrInsurance)],
                  ["Total PITI", formatCurrency(dscrPITI)],
                  ["Gross Rent", formatCurrency(dscrRent)],
                  ["DSCR (Rent ÷ PITI)", dscrRatio.toFixed(3)],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #EBF0FF", fontSize: 13 }}>
                    <span style={{ color: "#6B7A99" }}>{k}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>{v}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: "#F5F7FF", borderRadius: 12, padding: 20, border: "1px solid #EBF0FF" }}>
                <SectionTitle>Lender Benchmarks</SectionTitle>
                {[
                  ["Minimum (most lenders)", "1.00", dscrRatio >= 1.0],
                  ["Standard qualify", "1.20", dscrRatio >= 1.2],
                  ["Strong (best rates)", "1.25", dscrRatio >= 1.25],
                  ["Excellent", "1.50+", dscrRatio >= 1.5],
                ].map(([label, threshold, passes]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #EBF0FF", fontSize: 13 }}>
                    <span style={{ color: "#6B7A99" }}>{label}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: passes ? "#00B67A" : "#9BA8C0" }}>{threshold} {passes ? "✓" : ""}</span>
                  </div>
                ))}
                <div style={{ marginTop: 12, fontSize: 12, color: "#6B7A99", lineHeight: 1.6 }}>
                  To hit 1.25 DSCR, you need at least <strong style={{ color: "#0D1B3E" }}>{formatCurrency(minRentNeeded)}/mo</strong> in rent.
                </div>
              </div>

              <div style={{ background: "#F0F4FF", borderRadius: 12, padding: 18, border: "1px solid #D6DFFF" }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#0B5FFF", marginBottom: 8 }}>DEAL SIGNAL</div>
                <div style={{ fontSize: 13, color: "#0D1B3E", lineHeight: 1.6 }}>
                  {dscrQualifies
                    ? `✅ This property qualifies for DSCR financing. Ratio of ${dscrRatio.toFixed(2)} meets lender standards.`
                    : `❌ DSCR of ${dscrRatio.toFixed(2)} is below the 1.25 threshold. Increase rent, reduce loan amount, or find a better rate.`}
                </div>
              </div>
              {dscrQualifies && (
                <div style={{
                  background: "#fff", borderRadius: 12, padding: 18,
                  border: "1.5px solid #D6E8DD", display: "flex", alignItems: "center",
                  gap: 14, flexWrap: "wrap",
                }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0D1B3E", marginBottom: 3 }}>
                      Ready to move forward?
                    </div>
                    <div style={{ fontSize: 12, color: "#6B7A99", lineHeight: 1.5 }}>
                      This deal qualifies for DSCR financing. Get matched with investor-friendly lenders.
                    </div>
                  </div>
                  <a
                    href="https://www.offermarket.us/loans?ref=6fbr51lipme"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "#0B5FFF", color: "#fff", fontSize: 12.5, fontWeight: 700,
                      padding: "9px 16px", borderRadius: 8, textDecoration: "none",
                      whiteSpace: "nowrap", flexShrink: 0,
                    }}
                  >
                    See DSCR Lenders →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CTA to full app */}
        <div style={{ background: "#0D1B3E", borderRadius: 14, padding: "24px 28px", marginBottom: 48, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Need the full deal analysis?</div>
            <div style={{ fontSize: 13, color: "#6B8AAA" }}>SpreadRun also includes a Rental Analyzer and Fix & Flip Calculator — all free.</div>
          </div>
          <a href="/app#dscr" style={{ background: "#0B5FFF", color: "#fff", fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 10, textDecoration: "none", whiteSpace: "nowrap" }}>
            Try Full Analyzer →
          </a>
        </div>

        {/* FAQ / SEO CONTENT */}
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.4px", marginBottom: 24 }}>DSCR Calculator: Common Questions</h2>
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

        {/* FOOTER NOTE */}
        <div style={{ marginTop: 48, textAlign: "center", fontSize: 12, color: "#9BA8C0" }}>
          SpreadRun · Free real estate deal analyzer · <a href="/" style={{ color: "#9BA8C0" }}>spreadrun.com</a> · Not financial advice.
        </div>
      </div>
    </div>
  );
}
