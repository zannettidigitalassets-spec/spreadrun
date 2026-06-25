import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";
import { useAuth, useSubscription, AuthModal, UserMenu } from "./Auth.jsx";
import { generateDealReportPdf } from "./dealReportPdf.js";
import { setPageMeta, PAGE_META } from "./seo.js";

const formatCurrency = (val) =>
  val === "" || val === undefined || val === null || isNaN(val)
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(val));

const TOOL_LABELS = {
  rental: "Rental Analyzer",
  flip: "Fix & Flip",
  dscr: "DSCR Qualifier",
};

// Recompute headline numbers from saved inputs so the list shows something meaningful at a glance
function summarize(toolType, inputs) {
  const n_ = (v) => (v === "" || v === undefined || v === null || isNaN(v) ? 0 : Number(v));

  if (toolType === "rental") {
    const downAmount = (n_(inputs.purchasePrice) * n_(inputs.downPct)) / 100;
    const loanAmount = n_(inputs.purchasePrice) - downAmount;
    const monthlyRate = n_(inputs.interestRate) / 100 / 12;
    const n = n_(inputs.loanTermYears) * 12;
    const mortgage = monthlyRate > 0 && n > 0
      ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
      : (n > 0 ? loanAmount / n : 0);
    const effectiveRent = n_(inputs.rent) * (1 - n_(inputs.vacancyPct) / 100);
    const mgmtFee = effectiveRent * (n_(inputs.mgmtPct) / 100);
    const totalExpenses = mortgage + n_(inputs.taxes) + n_(inputs.insurance) + n_(inputs.maintenance) + mgmtFee + n_(inputs.otherExpenses);
    const cashFlow = effectiveRent - totalExpenses;
    return [
      { label: "Cash Flow", value: formatCurrency(cashFlow) + "/mo" },
      { label: "Purchase Price", value: formatCurrency(inputs.purchasePrice) },
    ];
  }

  if (toolType === "flip") {
    const totalIn = n_(inputs.flipPurchase) + n_(inputs.rehabCost);
    const holdingCosts = (n_(inputs.flipPurchase) * n_(inputs.holdingCostPct) / 100) * n_(inputs.holdingMonths);
    const agentFees = n_(inputs.arv) * n_(inputs.agentPct) / 100;
    const closingCosts = n_(inputs.arv) * n_(inputs.closingCostPct) / 100;
    const totalCosts = totalIn + holdingCosts + agentFees + closingCosts;
    const flipProfit = n_(inputs.arv) - totalCosts;
    return [
      { label: "Profit", value: formatCurrency(flipProfit) },
      { label: "ARV", value: formatCurrency(inputs.arv) },
    ];
  }

  if (toolType === "dscr") {
    const dscrMonthlyRate = n_(inputs.dscrRate) / 100 / 12;
    const dscrN = n_(inputs.dscrTerm) * 12;
    const dscrPayment = dscrMonthlyRate > 0 && dscrN > 0
      ? n_(inputs.dscrLoanAmount) * (dscrMonthlyRate * Math.pow(1 + dscrMonthlyRate, dscrN)) / (Math.pow(1 + dscrMonthlyRate, dscrN) - 1)
      : (dscrN > 0 ? n_(inputs.dscrLoanAmount) / dscrN : 0);
    const dscrPITI = dscrPayment + n_(inputs.dscrTaxes) + n_(inputs.dscrInsurance);
    const dscrRatio = dscrPITI > 0 ? n_(inputs.dscrRent) / dscrPITI : 0;
    return [
      { label: "DSCR", value: dscrRatio.toFixed(2) },
      { label: "Loan Amount", value: formatCurrency(inputs.dscrLoanAmount) },
    ];
  }

  return [];
}

function buildDeepLink(toolType, inputs) {
  const params = new URLSearchParams();
  Object.entries(inputs).forEach(([k, v]) => {
    if (v !== "" && v !== undefined && v !== null) params.set(k, v);
  });
  return `/app#${toolType}?${params.toString()}`;
}

export default function MyDeals() {
  useEffect(() => {
    setPageMeta(PAGE_META.myDeals.title, PAGE_META.myDeals.description);
  }, []);
  const { user, loading } = useAuth();
  const { isStarter, loading: subLoading } = useSubscription(user);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [deals, setDeals] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [pdfGeneratingId, setPdfGeneratingId] = useState(null);

  const handleDownloadPdf = async (deal) => {
    setPdfGeneratingId(deal.id);
    try {
      await generateDealReportPdf(deal.tool_type, deal.inputs, deal.label);
    } catch (err) {
      console.error("PDF generation failed:", err);
    }
    setPdfGeneratingId(null);
  };

  useEffect(() => {
    if (!user) {
      setDealsLoading(false);
      return;
    }
    const fetchDeals = async () => {
      setDealsLoading(true);
      const { data, error } = await supabase
        .from("saved_properties")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error) setDeals(data || []);
      setDealsLoading(false);
    };
    fetchDeals();
  }, [user]);

  const handleDelete = async (id) => {
    setDeletingId(id);
    const { error } = await supabase.from("saved_properties").delete().eq("id", id);
    if (!error) {
      setDeals(deals.filter((d) => d.id !== id));
      setSelected(selected.filter((s) => s !== id));
    }
    setDeletingId(null);
  };

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const compareSet = deals.filter((d) => selected.includes(d.id));

  if (loading || subLoading) return (
    <div style={{ minHeight: "100vh", background: "#F5F7FF", fontFamily: "'Inter', system-ui, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{ width: 6, height: 22, background: "#0B5FFF", borderRadius: 2 }} />
        <span style={{ fontWeight: 800, fontSize: 17, color: "#0D1B3E" }}>SpreadRun</span>
      </div>
      <div style={{ fontSize: 14, color: "#6B7A99" }}>Loading your deals...</div>
    </div>
  );

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: "#F5F7FF", fontFamily: "'Inter', system-ui, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div style={{ width: 6, height: 22, background: "#0B5FFF", borderRadius: 2 }} />
          <span style={{ fontWeight: 800, fontSize: 17, color: "#0D1B3E" }}>SpreadRun</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0D1B3E", margin: "0 0 10px" }}>Sign in to view your deals</h1>
        <p style={{ fontSize: 14.5, color: "#6B7A99", marginBottom: 24, textAlign: "center" }}>
          Your saved properties live here once you're signed in.
        </p>
        <button
          onClick={() => setShowAuthModal(true)}
          style={{ background: "#0B5FFF", color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}
        >
          Sign In
        </button>
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      </div>
    );
  }

  if (!isStarter) {
    return (
      <div style={{ minHeight: "100vh", background: "#F5F7FF", fontFamily: "'Inter', system-ui, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div style={{ width: 6, height: 22, background: "#0B5FFF", borderRadius: 2 }} />
          <span style={{ fontWeight: 800, fontSize: 17, color: "#0D1B3E" }}>SpreadRun</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0D1B3E", margin: "0 0 10px" }}>My Deals is a paid feature</h1>
        <p style={{ fontSize: 14.5, color: "#6B7A99", marginBottom: 24, textAlign: "center", maxWidth: 380 }}>
          Upgrade to save up to 10 properties, reopen them anytime, and compare deals side by side.
        </p>
        <a
          href="https://buy.stripe.com/eVq8wR6JcaZ8aSLguB5J601"
          style={{ background: "#0B5FFF", color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 14.5, fontWeight: 700, textDecoration: "none" }}
        >
          Save deals from $9/mo →
        </a>
        <a href="/app" style={{ marginTop: 16, fontSize: 13, color: "#6B7A99", textDecoration: "none" }}>← Back to Calculators</a>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F5F7FF", fontFamily: "'Inter', system-ui, sans-serif", color: "#0D1B3E" }}>
      <style>{`
        @media (max-width: 640px) {
          .sr-mydeals-header {
            flex-wrap: wrap !important;
            gap: 8px !important;
            padding: 14px 16px !important;
          }
          .sr-mydeals-header-actions {
            width: 100%;
            justify-content: space-between;
          }
          .sr-deal-card {
            flex-wrap: wrap !important;
          }
          .sr-deal-card-actions {
            width: 100%;
            justify-content: flex-end;
            border-top: 1px solid #EBF0FF;
            padding-top: 10px;
            margin-top: 6px;
          }
        }
      `}</style>
      <div className="sr-mydeals-header" style={{ background: "#0D1B3E", padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 28, background: "#0B5FFF", borderRadius: 2 }} />
            <a href="/" style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px", textDecoration: "none" }}>SpreadRun</a>
          </div>
          <div style={{ fontSize: 11, color: "#6B7A99", marginLeft: 18, marginTop: 2, letterSpacing: "0.08em" }}>MY DEALS</div>
        </div>
        <div className="sr-mydeals-header-actions" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <a href="/app" style={{ fontSize: 13, fontWeight: 600, color: "#A8C4FF", textDecoration: "none" }}>← Back to Calculators</a>
          <UserMenu user={user} isStarter={true} />
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Saved Deals</h1>
          <span style={{ fontSize: 13, color: "#6B7A99" }}>{deals.length} / 10 saved</span>
        </div>

        {selected.length > 0 && (
          <div style={{ fontSize: 13, color: "#0B5FFF", fontWeight: 600, marginBottom: 14 }}>
            {selected.length === 1
              ? "Select up to 2 more deals to compare side by side."
              : `Comparing ${selected.length} deals below.`}
          </div>
        )}

        {dealsLoading ? (
          <div style={{ color: "#6B7A99", fontSize: 14 }}>Loading your deals...</div>
        ) : deals.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 14, padding: 36, textAlign: "center", border: "1px solid #EBF0FF" }}>
            <p style={{ fontSize: 15, color: "#6B7A99", margin: "0 0 18px" }}>You haven't saved any deals yet.</p>
            <a href="/app" style={{ background: "#0B5FFF", color: "#fff", borderRadius: 10, padding: "11px 22px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
              Analyze a Property →
            </a>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {deals.map((deal) => {
              const stats = summarize(deal.tool_type, deal.inputs);
              const isSelected = selected.includes(deal.id);
              return (
                <div
                  key={deal.id}
                  className="sr-deal-card"
                  style={{
                    background: "#fff", borderRadius: 14, padding: "18px 20px",
                    border: isSelected ? "2px solid #0B5FFF" : "1px solid #EBF0FF",
                    display: "flex", alignItems: "center", gap: 16,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(deal.id)}
                    style={{ width: 18, height: 18, cursor: "pointer", flexShrink: 0, alignSelf: "flex-start", marginTop: 2 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#0D1B3E" }}>{deal.label}</span>
                      <span style={{
                        fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
                        color: "#0B5FFF", background: "#EEF3FF", padding: "2px 8px", borderRadius: 99, flexShrink: 0,
                      }}>{TOOL_LABELS[deal.tool_type]}</span>
                    </div>
                    <div style={{ display: "flex", gap: 18, fontSize: 13, color: "#6B7A99", flexWrap: "wrap" }}>
                      {stats.map((s) => (
                        <span key={s.label}><strong style={{ color: "#0D1B3E" }}>{s.value}</strong> {s.label}</span>
                      ))}
                    </div>
                  </div>
                  <div className="sr-deal-card-actions" style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <a
                      href={buildDeepLink(deal.tool_type, deal.inputs)}
                      style={{
                        fontSize: 12.5, fontWeight: 700, color: "#0B5FFF", textDecoration: "none",
                        border: "1.5px solid #0B5FFF", borderRadius: 8, padding: "7px 12px",
                      }}
                    >
                      Reopen
                    </a>
                    <button
                      onClick={() => handleDownloadPdf(deal)}
                      disabled={pdfGeneratingId === deal.id}
                      style={{
                        fontSize: 12.5, fontWeight: 700, color: "#0B5FFF", background: "none",
                        border: "1.5px solid #0B5FFF", borderRadius: 8, padding: "7px 12px", cursor: "pointer",
                      }}
                    >
                      {pdfGeneratingId === deal.id ? "..." : "PDF"}
                    </button>
                    <button
                      onClick={() => handleDelete(deal.id)}
                      disabled={deletingId === deal.id}
                      style={{
                        fontSize: 12.5, fontWeight: 700, color: "#D14343", background: "none",
                        border: "1.5px solid #F3D6D6", borderRadius: 8, padding: "7px 12px", cursor: "pointer",
                      }}
                    >
                      {deletingId === deal.id ? "..." : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {compareSet.length >= 2 && (
          <div style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 14px" }}>Side-by-Side Comparison</h2>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${compareSet.length}, 1fr)`, gap: 14 }}>
              {compareSet.map((deal) => (
                <div key={deal.id} style={{ background: "#fff", borderRadius: 14, padding: 18, border: "1px solid #EBF0FF" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>{deal.label}</div>
                  {summarize(deal.tool_type, deal.inputs).map((s) => (
                    <div key={s.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F0F4FF", fontSize: 13 }}>
                      <span style={{ color: "#6B7A99" }}>{s.label}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
