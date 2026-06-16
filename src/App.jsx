import { useState } from "react";
import { supabase } from "./supabaseClient.js";
import { useAuth, AuthModal, UserMenu } from "./Auth.jsx";

const formatCurrency = (val) =>
  val === "" || val === undefined || val === null
    ? ""
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(val));

const formatPct = (val) =>
  val === null || val === undefined || isNaN(val) ? "—" : `${val.toFixed(2)}%`;

const Pill = ({ label, value, highlight }) => (
  <div style={{
    background: highlight ? "#0B5FFF" : "#F0F4FF",
    borderRadius: 10,
    padding: "18px 22px",
    minWidth: 140,
    flex: 1,
  }}>
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: highlight ? "#A8C4FF" : "#6B7A99", marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 800, color: highlight ? "#fff" : "#0D1B3E", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "-0.5px" }}>{value}</div>
  </div>
);

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
        onChange={e => {
          const v = e.target.value;
          onChange(v === "" ? "" : parseFloat(v));
        }}
        style={{
          width: "100%",
          padding: prefix ? "10px 12px 10px 28px" : "10px 12px",
          border: "1.5px solid #D6DFFF",
          borderRadius: 8,
          fontSize: 14,
          fontFamily: "'IBM Plex Mono', monospace",
          color: "#0D1B3E",
          background: "#FAFBFF",
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color 0.15s",
        }}
        onFocus={e => e.target.style.borderColor = "#0B5FFF"}
        onBlur={e => e.target.style.borderColor = "#D6DFFF"}
      />
    </div>
    {hint && <div style={{ fontSize: 11, color: "#9BA8C0" }}>{hint}</div>}
  </div>
);

const Tab = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: "10px 20px",
      border: "none",
      background: active ? "#0B5FFF" : "transparent",
      color: active ? "#fff" : "#6B7A99",
      borderRadius: 8,
      fontWeight: 700,
      fontSize: 13,
      cursor: "pointer",
      transition: "all 0.15s",
      letterSpacing: "0.03em",
    }}
  >
    {label}
  </button>
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
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
};

const getInitialTab = () => {
  const hash = window.location.hash.replace('#', '');
  if (['rental', 'flip', 'dscr'].includes(hash)) return hash;
  return 'rental';
};

const SaveDealButton = ({ user, onRequireAuth, toolType, inputs }) => {
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error | limit
  const [showLabelPrompt, setShowLabelPrompt] = useState(false);
  const [label, setLabel] = useState("");

  const handleClick = () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    setShowLabelPrompt(true);
  };

  const handleSave = async () => {
    setStatus("saving");

    const { count } = await supabase
      .from("saved_properties")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((count ?? 0) >= 10) {
      setStatus("limit");
      return;
    }

    const { error } = await supabase.from("saved_properties").insert({
      user_id: user.id,
      label: label || `${toolType} deal`,
      tool_type: toolType,
      inputs,
    });

    if (error) {
      setStatus("error");
    } else {
      setStatus("saved");
      setShowLabelPrompt(false);
      setLabel("");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  if (showLabelPrompt) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8, background: "#F0F4FF",
        borderRadius: 10, padding: "8px 10px",
      }}>
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Name this deal (optional)"
          style={{
            border: "1.5px solid #D6DFFF", borderRadius: 8, padding: "7px 10px",
            fontSize: 13, outline: "none", width: 180,
          }}
        />
        <button
          onClick={handleSave}
          disabled={status === "saving"}
          style={{
            background: "#0B5FFF", color: "#fff", border: "none", borderRadius: 8,
            padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
          }}
        >
          {status === "saving" ? "Saving..." : "Save"}
        </button>
        <button
          onClick={() => setShowLabelPrompt(false)}
          style={{ background: "none", border: "none", color: "#9BA8C0", fontSize: 12.5, cursor: "pointer" }}
        >
          Cancel
        </button>
      </div>
    );
  }

  if (status === "limit") {
    return (
      <div style={{ fontSize: 12.5, color: "#D14343", fontWeight: 600 }}>
        You've hit the 10 saved deal limit. Delete one from My Deals to save another.
      </div>
    );
  }

  if (status === "saved") {
    return (
      <div style={{ fontSize: 13, color: "#00B67A", fontWeight: 700 }}>✓ Saved to My Deals</div>
    );
  }

  return (
    <button
      onClick={handleClick}
      style={{
        background: "#fff", color: "#0B5FFF", border: "1.5px solid #0B5FFF",
        borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700,
        cursor: "pointer", letterSpacing: "0.02em",
      }}
    >
      Save This Deal
    </button>
  );
};

export default function DealAnalyzer() {
  const [tab, setTab] = useState(getInitialTab);
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Rental state
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

  // Flip state
  const [flipPurchase, setFlipPurchase] = useState(200000);
  const [rehabCost, setRehabCost] = useState(45000);
  const [arv, setArv] = useState(320000);
  const [holdingMonths, setHoldingMonths] = useState(4);
  const [holdingCostPct, setHoldingCostPct] = useState(1);
  const [agentPct, setAgentPct] = useState(6);
  const [closingCostPct, setClosingCostPct] = useState(2);

  // DSCR state
  const [dscrRent, setDscrRent] = useState(2400);
  const [dscrLoanAmount, setDscrLoanAmount] = useState(262500);
  const [dscrRate, setDscrRate] = useState(7.5);
  const [dscrTerm, setDscrTerm] = useState(30);
  const [dscrTaxes, setDscrTaxes] = useState(350);
  const [dscrInsurance, setDscrInsurance] = useState(120);

  // --- Rental Calculations ---
  const n_ = (v) => (v === "" || v === undefined || v === null || isNaN(v) ? 0 : Number(v));
  const downAmount = (n_(purchasePrice) * n_(downPct)) / 100;
  const loanAmount = n_(purchasePrice) - downAmount;
  const monthlyRate = n_(interestRate) / 100 / 12;
  const n = n_(loanTermYears) * 12;
  const mortgage = monthlyRate > 0 && n > 0
    ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
    : (n > 0 ? loanAmount / n : 0);
  const effectiveRent = n_(rent) * (1 - n_(vacancyPct) / 100);
  const mgmtFee = effectiveRent * (n_(mgmtPct) / 100);
  const totalExpenses = mortgage + n_(taxes) + n_(insurance) + n_(maintenance) + mgmtFee + n_(otherExpenses);
  const noi = effectiveRent - (n_(taxes) + n_(insurance) + n_(maintenance) + mgmtFee + n_(otherExpenses));
  const cashFlow = effectiveRent - totalExpenses;
  const cashOnCash = downAmount > 0 ? (cashFlow * 12 / downAmount) * 100 : 0;
  const capRate = n_(purchasePrice) > 0 ? (noi * 12 / n_(purchasePrice)) * 100 : 0;
  const dscr = mortgage > 0 ? noi / mortgage : 0;
  const grossYield = n_(purchasePrice) > 0 ? (n_(rent) * 12 / n_(purchasePrice)) * 100 : 0;

  // --- Flip Calculations ---
  const totalIn = n_(flipPurchase) + n_(rehabCost);
  const holdingCosts = (n_(flipPurchase) * n_(holdingCostPct) / 100) * n_(holdingMonths);
  const agentFees = n_(arv) * n_(agentPct) / 100;
  const closingCosts = n_(arv) * n_(closingCostPct) / 100;
  const totalCosts = totalIn + holdingCosts + agentFees + closingCosts;
  const flipProfit = n_(arv) - totalCosts;
  const flipROI = totalIn > 0 ? (flipProfit / totalIn) * 100 : 0;
  const maxAllowable = n_(arv) * 0.7 - n_(rehabCost);

  // --- DSCR Calculations ---
  const dscrMonthlyRate = n_(dscrRate) / 100 / 12;
  const dscrN = n_(dscrTerm) * 12;
  const dscrPayment = dscrMonthlyRate > 0 && dscrN > 0
    ? n_(dscrLoanAmount) * (dscrMonthlyRate * Math.pow(1 + dscrMonthlyRate, dscrN)) / (Math.pow(1 + dscrMonthlyRate, dscrN) - 1)
    : (dscrN > 0 ? n_(dscrLoanAmount) / dscrN : 0);
  const dscrPITI = dscrPayment + n_(dscrTaxes) + n_(dscrInsurance);
  const dscrRatio = dscrPITI > 0 ? n_(dscrRent) / dscrPITI : 0;
  const dscrQualifies = dscrRatio >= 1.25;
  const minRentNeeded = dscrPITI * 1.25;

  const cashFlowColor = cashFlow >= 0 ? "#00B67A" : "#E53935";
  const flipProfitColor = flipProfit >= 0 ? "#00B67A" : "#E53935";

  const currentInputs = {
    rental: { purchasePrice, downPct, interestRate, loanTermYears, rent, vacancyPct, taxes, insurance, maintenance, mgmtPct, otherExpenses },
    flip: { flipPurchase, rehabCost, arv, holdingMonths, holdingCostPct, agentPct, closingCostPct },
    dscr: { dscrRent, dscrLoanAmount, dscrRate, dscrTerm, dscrTaxes, dscrInsurance },
  }[tab];

  return (
    <div style={{ minHeight: "100vh", background: "#F5F7FF", fontFamily: "'Inter', system-ui, sans-serif", color: "#0D1B3E" }}>
      {/* Header */}
      <div style={{ background: "#0D1B3E", padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 28, background: "#0B5FFF", borderRadius: 2 }} />
            <a href="/" style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px", textDecoration: "none" }}>SpreadRun</a>
          </div>
          <div style={{ fontSize: 11, color: "#6B7A99", marginLeft: 18, marginTop: 2, letterSpacing: "0.08em" }}>DEAL ANALYZER</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {!loading && (
            user ? (
              <>
                <a href="/app/my-deals" style={{ fontSize: 13, fontWeight: 600, color: "#A8C4FF", textDecoration: "none" }}>My Deals</a>
                <UserMenu user={user} />
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                style={{
                  background: "transparent", color: "#fff", border: "1.5px solid #2A3F6E",
                  borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}
              >
                Sign In
              </button>
            )
          )}
          <div style={{ background: "#0B5FFF", color: "#fff", fontSize: 12, fontWeight: 700, padding: "8px 16px", borderRadius: 8, cursor: "pointer", letterSpacing: "0.04em" }}>
            Upgrade →
          </div>
        </div>
      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      {/* Tab Bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #EBF0FF", padding: "8px 28px", display: "flex", gap: 4, justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4 }}>
          <Tab label="Rental Analyzer" active={tab === "rental"} onClick={() => setTab("rental")} />
          <Tab label="Fix & Flip" active={tab === "flip"} onClick={() => setTab("flip")} />
          <Tab label="DSCR Qualifier" active={tab === "dscr"} onClick={() => setTab("dscr")} />
        </div>
        <SaveDealButton
          user={user}
          onRequireAuth={() => setShowAuthModal(true)}
          toolType={tab}
          inputs={currentInputs}
        />
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>

        {/* RENTAL TAB */}
        {tab === "rental" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Pill label="Monthly Cash Flow" value={<span style={{ color: cashFlowColor }}>{formatCurrency(cashFlow)}</span>} highlight />
              <Pill label="Cash-on-Cash" value={formatPct(cashOnCash)} />
              <Pill label="Cap Rate" value={formatPct(capRate)} />
              <Pill label="DSCR" value={dscr.toFixed(2)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "#fff", borderRadius: 14, padding: 22, border: "1px solid #EBF0FF" }}>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: "#fff", borderRadius: 14, padding: 22, border: "1px solid #EBF0FF" }}>
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
                <div style={{ background: "#fff", borderRadius: 14, padding: 22, border: "1px solid #EBF0FF" }}>
                  <SectionTitle>Return Metrics</SectionTitle>
                  {[
                    ["Gross Rent Yield", formatPct(grossYield)],
                    ["Cap Rate (NOI basis)", formatPct(capRate)],
                    ["Cash-on-Cash Return", formatPct(cashOnCash)],
                    ["DSCR", dscr.toFixed(2)],
                    ["Annual Cash Flow", formatCurrency(cashFlow * 12)],
                    ["Total Cash Invested", formatCurrency(downAmount)],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F0F4FF", fontSize: 13 }}>
                      <span style={{ color: "#6B7A99" }}>{k}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: "#F0F4FF", borderRadius: 14, padding: 18, border: "1px solid #D6DFFF" }}>
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
        )}

        {/* FLIP TAB */}
        {tab === "flip" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Pill label="Profit" value={<span style={{ color: flipProfitColor }}>{formatCurrency(flipProfit)}</span>} highlight />
              <Pill label="ROI" value={<span style={{ color: flipProfit >= 0 ? "#00B67A" : "#E53935" }}>{formatPct(flipROI)}</span>} />
              <Pill label="Max Allowable Offer" value={formatCurrency(maxAllowable)} />
              <Pill label="Total In" value={formatCurrency(totalIn)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "#fff", borderRadius: 14, padding: 22, border: "1px solid #EBF0FF" }}>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: "#fff", borderRadius: 14, padding: 22, border: "1px solid #EBF0FF" }}>
                  <SectionTitle>Cost Stack</SectionTitle>
                  {[
                    ["Purchase Price", flipPurchase],
                    ["Rehab Costs", rehabCost],
                    ["Holding Costs", holdingCosts],
                    ["Agent Fees", agentFees],
                    ["Closing Costs", closingCosts],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F0F4FF", fontSize: 13 }}>
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
                <div style={{ background: "#fff", borderRadius: 14, padding: 22, border: "1px solid #EBF0FF" }}>
                  <SectionTitle>70% Rule Check</SectionTitle>
                  <div style={{ fontSize: 13, color: "#6B7A99", marginBottom: 12, lineHeight: 1.6 }}>
                    The 70% rule says: pay no more than 70% of ARV minus rehab costs.
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "#6B7A99" }}>Max Allowable Offer</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>{formatCurrency(maxAllowable)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 8 }}>
                    <span style={{ color: "#6B7A99" }}>Your Offer</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: flipPurchase <= maxAllowable ? "#00B67A" : "#E53935" }}>{formatCurrency(flipPurchase)}</span>
                  </div>
                </div>
                <div style={{ background: "#F0F4FF", borderRadius: 14, padding: 18, border: "1px solid #D6DFFF" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#0B5FFF", marginBottom: 8 }}>DEAL SIGNAL</div>
                  <div style={{ fontSize: 13, color: "#0D1B3E", lineHeight: 1.6 }}>
                    {flipProfit >= 30000 && flipROI >= 20
                      ? "✅ Strong flip. Profit and ROI both meet investor benchmarks."
                      : flipProfit >= 0 && flipProfit < 30000
                      ? "⚠️ Marginal. Profit exists but leaves little buffer for surprises."
                      : "❌ Losing deal. Reduce purchase price or rehab costs."}
                    {flipPurchase <= maxAllowable ? " Purchase price passes the 70% rule." : " Purchase price exceeds the 70% rule — overpaying."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DSCR TAB */}
        {tab === "dscr" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Pill label="DSCR Ratio" value={<span style={{ color: dscrQualifies ? "#00B67A" : "#E53935" }}>{dscrRatio.toFixed(2)}</span>} highlight />
              <Pill label="Monthly PITI" value={formatCurrency(dscrPITI)} />
              <Pill label="Min Rent Needed" value={formatCurrency(minRentNeeded)} />
              <Pill label="Status" value={dscrQualifies ? "✅ Qualifies" : "❌ Does Not"} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "#fff", borderRadius: 14, padding: 22, border: "1px solid #EBF0FF" }}>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: "#fff", borderRadius: 14, padding: 22, border: "1px solid #EBF0FF" }}>
                  <SectionTitle>DSCR Breakdown</SectionTitle>
                  {[
                    ["Principal & Interest", formatCurrency(dscrPayment)],
                    ["Taxes", formatCurrency(dscrTaxes)],
                    ["Insurance", formatCurrency(dscrInsurance)],
                    ["Total PITI", formatCurrency(dscrPITI)],
                    ["Gross Rent", formatCurrency(dscrRent)],
                    ["DSCR (Rent ÷ PITI)", dscrRatio.toFixed(3)],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F0F4FF", fontSize: 13 }}>
                      <span style={{ color: "#6B7A99" }}>{k}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: "#fff", borderRadius: 14, padding: 22, border: "1px solid #EBF0FF" }}>
                  <SectionTitle>Lender Benchmarks</SectionTitle>
                  {[
                    ["Minimum (most lenders)", "1.00", dscrRatio >= 1.0],
                    ["Standard qualify", "1.20", dscrRatio >= 1.2],
                    ["Strong (best rates)", "1.25", dscrRatio >= 1.25],
                    ["Excellent", "1.50+", dscrRatio >= 1.5],
                  ].map(([label, threshold, passes]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F0F4FF", fontSize: 13 }}>
                      <span style={{ color: "#6B7A99" }}>{label}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: passes ? "#00B67A" : "#D6DFFF" }}>{threshold} {passes ? "✓" : ""}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 14, fontSize: 12, color: "#6B7A99", lineHeight: 1.6 }}>
                    To hit 1.25 DSCR, you need at least <strong style={{ color: "#0D1B3E" }}>{formatCurrency(minRentNeeded)}/mo</strong> in rent.
                  </div>
                </div>
                <div style={{ background: "#F0F4FF", borderRadius: 14, padding: 18, border: "1px solid #D6DFFF" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#0B5FFF", marginBottom: 8 }}>DEAL SIGNAL</div>
                  <div style={{ fontSize: 13, color: "#0D1B3E", lineHeight: 1.6 }}>
                    {dscrQualifies
                      ? `✅ This property qualifies for DSCR financing. Ratio of ${dscrRatio.toFixed(2)} meets lender standards.`
                      : `❌ DSCR of ${dscrRatio.toFixed(2)} is below the 1.25 threshold. Increase rent, reduce loan amount, or find a better rate.`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 32, padding: "20px 0", borderTop: "1px solid #EBF0FF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 11, color: "#9BA8C0" }}>SpreadRun · For informational purposes only. Not financial advice.</div>
          <div style={{ fontSize: 12, color: "#0B5FFF", fontWeight: 700, cursor: "pointer" }}>Save 10 deals + compare side by side →</div>
        </div>
      </div>
    </div>
  );
}
