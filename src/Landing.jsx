import { useState } from "react";

const FORMSPREE_URL = "https://formspree.io/f/mvznljer";

const METRICS = [
  { value: "3", label: "Tools in one" },
  { value: "$0", label: "To get started" },
  { value: "60s", label: "To analyze a deal" },
];

const FEATURES = [
  {
    tag: "Rental Analyzer",
    headline: "Know your cash flow before you close.",
    body: "Input any property and get instant cash-on-cash return, cap rate, DSCR, and monthly breakdown. No spreadsheet required.",
    href: "/app#rental",
    stats: [
      { label: "Cap Rate", val: "6.2%" },
      { label: "Cash Flow", val: "$340/mo" },
      { label: "DSCR", val: "1.31" },
    ],
  },
  {
    tag: "Fix & Flip",
    headline: "Run the numbers on any flip in seconds.",
    body: "Purchase price, rehab costs, ARV, holding costs — see your profit, ROI, and whether the deal passes the 70% rule instantly.",
    href: "/app#flip",
    stats: [
      { label: "Net Profit", val: "$42,800" },
      { label: "ROI", val: "24.1%" },
      { label: "70% Rule", val: "✓ Pass" },
    ],
  },
  {
    tag: "DSCR Qualifier",
    headline: "Find out if the bank will say yes.",
    body: "Enter your loan details and rent to see your DSCR ratio and exactly how much rent you need to qualify for investor financing.",
    href: "/app#dscr",
    stats: [
      { label: "DSCR Ratio", val: "1.28" },
      { label: "Min Rent", val: "$2,190" },
      { label: "Status", val: "✓ Qualifies" },
    ],
  },
];

const PRICING = [
  {
    tier: "Free",
    price: "$0",
    period: "forever",
    desc: "For investors just getting started.",
    features: [
      "Rental Analyzer",
      "Fix & Flip Calculator",
      "DSCR Qualifier",
      "Live deal signals",
      "Unlimited calculations",
    ],
    cta: "Start analyzing",
    href: "/app",
    highlight: false,
  },
  {
    tier: "Starter",
    price: "$19",
    period: "per month",
    desc: "For investors comparing multiple deals.",
    features: [
      "Everything in Free",
      "Save up to 10 properties",
      "Deal comparison view",
      "PDF deal reports",
      "Email support",
    ],
    cta: "Get Starter — $19/mo",
    href: "/app",
    highlight: false,
  },
  {
    tier: "Pro",
    price: "$79",
    period: "per month",
    desc: "For serious investors building a portfolio.",
    features: [
      "Everything in Starter",
      "Unlimited saved properties",
      "Portfolio tracker & dashboard",
      "Live market rent estimates",
      "Upload OM/pro-forma — auto-fills calculators",
      "AI deal analyzer",
      "Priority support",
    ],
    cta: "Get Pro — $79/mo",
    href: "/app",
    highlight: true,
  },
];

const COMING_SOON = [
  {
    name: "Portfolio Tracker",
    tier: "Pro",
    desc: "Track every property you own in one dashboard — equity, cash flow, and performance over time.",
  },
  {
    name: "Deal Comparison",
    tier: "Starter",
    desc: "Stack two or more deals side by side and see exactly which one wins on the numbers.",
  },
  {
    name: "Market Rent Estimator",
    tier: "Pro",
    desc: "Pull live comparable rent data for any address before you even make an offer.",
  },
  {
    name: "OM / Pro-Forma Upload",
    tier: "Pro",
    desc: "Drop in a PDF offering memorandum or spreadsheet — we extract the numbers and fill the calculator for you.",
  },
];

const FAQS = [
  {
    q: "Do I need to create an account?",
    a: "No account needed to use the free tools. Sign up only when you want to save deals or access Pro features.",
  },
  {
    q: "Is this for beginners or experienced investors?",
    a: "Both. The interface is simple enough for your first deal and fast enough for your fiftieth.",
  },
  {
    q: "What is DSCR and why does it matter?",
    a: "Debt Service Coverage Ratio is what lenders use to decide if a rental property qualifies for an investor loan. A ratio above 1.25 means the rent covers the mortgage with room to spare.",
  },
  {
    q: "Can I use this on mobile?",
    a: "Yes — SpreadRun works on any device. Analyze deals from the road, at a showing, or anywhere else.",
  },
];

export default function Landing() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [openFaq, setOpenFaq] = useState(null);

  const handleSubmit = async () => {
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(FORMSPREE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: "#0D1B3E", background: "#fff", overflowX: "hidden" }}>
      <style>{`
        .sr-feature-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
        .sr-pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .sr-soon-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        @media (max-width: 760px) {
          .sr-feature-grid {
            grid-template-columns: 1fr !important;
          }
          .sr-feature-grid > div {
            order: unset !important;
          }
          .sr-pricing-grid {
            grid-template-columns: 1fr !important;
          }
          .sr-soon-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* NAV */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)",
        borderBottom: "1px solid #EBF0FF",
        padding: "0 24px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 6, height: 22, background: "#0B5FFF", borderRadius: 2 }} />
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.3px" }}>SpreadRun</span>
        </div>
        <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
          <a href="#features" style={{ fontSize: 14, fontWeight: 500, color: "#6B7A99", textDecoration: "none" }}>Features</a>
          <a href="#pricing" style={{ fontSize: 14, fontWeight: 500, color: "#6B7A99", textDecoration: "none" }}>Pricing</a>
          <a href="/guides" style={{ fontSize: 14, fontWeight: 500, color: "#6B7A99", textDecoration: "none" }}>Guides</a>
          <a href="#faq" style={{ fontSize: 14, fontWeight: 500, color: "#6B7A99", textDecoration: "none" }}>FAQ</a>
          <a href="/app" style={{
            background: "#0B5FFF", color: "#fff",
            fontSize: 13, fontWeight: 700, padding: "8px 18px",
            borderRadius: 8, textDecoration: "none", letterSpacing: "0.02em",
          }}>Try Free →</a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        background: "#0D1B3E", padding: "80px 24px 72px",
        textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0, opacity: 0.04,
          backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />
        <div style={{ position: "relative", maxWidth: 720, margin: "0 auto" }}>
          <div style={{
            display: "inline-block",
            background: "rgba(11,95,255,0.18)", border: "1px solid rgba(11,95,255,0.4)",
            color: "#7EB3FF", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em",
            padding: "5px 14px", borderRadius: 99, marginBottom: 28, textTransform: "uppercase",
          }}>
            Free Real Estate Deal Analyzer
          </div>
          <h1 style={{
            fontSize: "clamp(36px, 6vw, 62px)", fontWeight: 900, color: "#fff",
            lineHeight: 1.08, letterSpacing: "-1.5px", margin: "0 0 22px",
          }}>
            Know if a deal works<br />
            <span style={{ color: "#4D8FFF" }}>before you make an offer.</span>
          </h1>
          <p style={{
            fontSize: "clamp(16px, 2vw, 19px)", color: "#8FA8CC",
            maxWidth: 520, margin: "0 auto 40px", lineHeight: 1.6, fontWeight: 400,
          }}>
            Rental analyzer, fix & flip calculator, and DSCR qualifier — all in one tool. No spreadsheets. No guesswork.
          </p>

          {/* Email capture */}
          {!submitted ? (
            <div style={{ maxWidth: 440, margin: "0 auto" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  style={{
                    flex: 1, minWidth: 220, padding: "13px 18px",
                    border: error ? "1.5px solid #E53935" : "1.5px solid rgba(255,255,255,0.15)",
                    borderRadius: 10, fontSize: 15,
                    background: "rgba(255,255,255,0.08)", color: "#fff", outline: "none",
                  }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    background: submitting ? "#3D6FCC" : "#0B5FFF", color: "#fff",
                    border: "none", borderRadius: 10,
                    padding: "13px 24px", fontSize: 15, fontWeight: 700,
                    cursor: submitting ? "default" : "pointer", whiteSpace: "nowrap",
                  }}
                >
                  {submitting ? "Sending..." : "Get early access"}
                </button>
              </div>
              {error && <div style={{ color: "#FF6B6B", fontSize: 13, marginTop: 8 }}>{error}</div>}
            </div>
          ) : (
            <div style={{
              background: "rgba(0,182,122,0.15)", border: "1px solid rgba(0,182,122,0.3)",
              color: "#00B67A", padding: "14px 28px", borderRadius: 10,
              fontSize: 15, fontWeight: 600, display: "inline-block",
            }}>
              ✓ You're on the list — we'll be in touch soon.
            </div>
          )}

          <div style={{ marginTop: 16, fontSize: 12, color: "#4A6080" }}>
            Free forever · No credit card · No spam
          </div>

          <div style={{ display: "flex", gap: 32, justifyContent: "center", marginTop: 56, flexWrap: "wrap" }}>
            {METRICS.map(m => (
              <div key={m.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: "#fff", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "-1px" }}>{m.value}</div>
                <div style={{ fontSize: 12, color: "#4A6080", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 4 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: "80px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#0B5FFF", textTransform: "uppercase", marginBottom: 12 }}>Three tools, one place</div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, letterSpacing: "-0.8px", margin: 0 }}>
            Every number you need<br />to make a confident decision.
          </h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {FEATURES.map((f, i) => (
            <div key={f.tag} className="sr-feature-grid" style={{
              borderRadius: 16, overflow: "hidden", border: "1px solid #EBF0FF",
            }}>
              <div style={{
                padding: "44px", background: i % 2 === 0 ? "#fff" : "#F5F7FF",
                display: "flex", flexDirection: "column", justifyContent: "center",
                order: i % 2 === 0 ? 0 : 1,
              }}>
                <div style={{
                  display: "inline-block", fontSize: 11, fontWeight: 800,
                  letterSpacing: "0.12em", textTransform: "uppercase",
                  color: "#0B5FFF", background: "#EEF3FF",
                  padding: "4px 12px", borderRadius: 99, marginBottom: 18, width: "fit-content",
                }}>{f.tag}</div>
                <h3 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.4px", margin: "0 0 14px", lineHeight: 1.2 }}>{f.headline}</h3>
                <p style={{ fontSize: 15, color: "#6B7A99", lineHeight: 1.7, margin: "0 0 28px" }}>{f.body}</p>
                <a href={f.href} style={{ display: "inline-block", fontSize: 13, fontWeight: 700, color: "#0B5FFF", textDecoration: "none" }}>Try it free →</a>
              </div>
              <div style={{
                padding: "44px", background: i % 2 === 0 ? "#0D1B3E" : "#0B1830",
                display: "flex", flexDirection: "column", justifyContent: "center", gap: 20,
                order: i % 2 === 0 ? 1 : 0,
              }}>
                {f.stats.map(s => (
                  <div key={s.label} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "16px 20px", background: "rgba(255,255,255,0.05)",
                    borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)",
                  }}>
                    <span style={{ fontSize: 13, color: "#6B8AAA", fontWeight: 600 }}>{s.label}</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: "#fff", fontFamily: "'IBM Plex Mono', monospace" }}>{s.val}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ background: "#F5F7FF", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#0B5FFF", textTransform: "uppercase", marginBottom: 12 }}>Pricing</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 900, letterSpacing: "-0.8px", margin: 0 }}>
              Start free. Upgrade when it pays off.
            </h2>
          </div>
          <div className="sr-pricing-grid">
            {PRICING.map(p => (
              <div key={p.tier} style={{
                background: p.highlight ? "#0D1B3E" : "#fff",
                border: p.highlight ? "2px solid #0B5FFF" : "1.5px solid #EBF0FF",
                borderRadius: 16, padding: "32px 26px", position: "relative",
              }}>
                {p.highlight && (
                  <div style={{
                    position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)",
                    background: "#0B5FFF", color: "#fff", fontSize: 11, fontWeight: 800,
                    letterSpacing: "0.1em", padding: "4px 16px", borderRadius: 99,
                    textTransform: "uppercase", whiteSpace: "nowrap",
                  }}>Most Popular</div>
                )}
                <div style={{ fontSize: 13, fontWeight: 700, color: p.highlight ? "#4D8FFF" : "#0B5FFF", marginBottom: 8 }}>{p.tier}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: p.highlight ? "#fff" : "#0D1B3E", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "-1px" }}>{p.price}</span>
                  <span style={{ fontSize: 12, color: p.highlight ? "#6B8AAA" : "#9BA8C0" }}>/{p.period}</span>
                </div>
                <div style={{ fontSize: 13, color: p.highlight ? "#6B8AAA" : "#9BA8C0", marginBottom: 24, minHeight: 36 }}>{p.desc}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                  {p.features.map(feat => (
                    <div key={feat} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13.5, color: p.highlight ? "#C8D8EE" : "#3D4F6E" }}>
                      <span style={{ color: "#0B5FFF", fontWeight: 800, marginTop: 1 }}>✓</span>
                      {feat}
                    </div>
                  ))}
                </div>
                <a href={p.href} style={{
                  display: "block", textAlign: "center",
                  background: p.highlight ? "#0B5FFF" : "#EEF3FF",
                  color: p.highlight ? "#fff" : "#0B5FFF",
                  padding: "13px", borderRadius: 10,
                  fontSize: 13.5, fontWeight: 700, textDecoration: "none",
                }}>{p.cta}</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMING SOON */}
      <section style={{ padding: "80px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#0B5FFF", textTransform: "uppercase", marginBottom: 12 }}>Coming Soon</div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 900, letterSpacing: "-0.8px", margin: "0 0 14px" }}>
            We're just getting started.
          </h2>
          <p style={{ fontSize: 15, color: "#6B7A99", maxWidth: 480, margin: "0 auto" }}>
            Sign up for free now and you'll be the first to know when these go live.
          </p>
        </div>
        <div className="sr-soon-grid">
          {COMING_SOON.map(item => (
            <div key={item.name} style={{
              background: "#fff", border: "1.5px solid #EBF0FF", borderRadius: 14,
              padding: "26px 28px", position: "relative",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, letterSpacing: "-0.2px" }}>{item.name}</h3>
                <span style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
                  color: item.tier === "Pro" ? "#0B5FFF" : "#00866B",
                  background: item.tier === "Pro" ? "#EEF3FF" : "#E6F7F2",
                  padding: "3px 10px", borderRadius: 99, whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12,
                }}>{item.tier}</span>
              </div>
              <p style={{ fontSize: 13.5, color: "#6B7A99", lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: "80px 24px", maxWidth: 640, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#0B5FFF", textTransform: "uppercase", marginBottom: 12 }}>FAQ</div>
          <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 900, letterSpacing: "-0.6px", margin: 0 }}>Common questions</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {FAQS.map((f, i) => (
            <div key={i} style={{ borderBottom: "1px solid #EBF0FF" }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: "100%", textAlign: "left", background: "none", border: "none",
                  padding: "20px 0", cursor: "pointer",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  fontSize: 15, fontWeight: 700, color: "#0D1B3E",
                }}
              >
                {f.q}
                <span style={{ fontSize: 18, color: "#0B5FFF", fontWeight: 400, marginLeft: 16, flexShrink: 0 }}>
                  {openFaq === i ? "−" : "+"}
                </span>
              </button>
              {openFaq === i && (
                <div style={{ fontSize: 14, color: "#6B7A99", lineHeight: 1.7, paddingBottom: 20 }}>{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section style={{ background: "#0D1B3E", padding: "72px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.8px", margin: "0 0 16px" }}>
            Analyze your next deal free.
          </h2>
          <p style={{ fontSize: 16, color: "#6B8AAA", marginBottom: 36, lineHeight: 1.6 }}>
            No account required. Open the tool and start running numbers in under a minute.
          </p>
          <a href="/app" style={{
            display: "inline-block", background: "#0B5FFF", color: "#fff",
            fontSize: 16, fontWeight: 700, padding: "16px 36px",
            borderRadius: 12, textDecoration: "none",
          }}>
            Open SpreadRun Free →
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: "1px solid #EBF0FF", padding: "24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 5, height: 18, background: "#0B5FFF", borderRadius: 2 }} />
          <span style={{ fontWeight: 800, fontSize: 14 }}>SpreadRun</span>
        </div>
        <div style={{ fontSize: 12, color: "#9BA8C0" }}>
          © 2026 SpreadRun · For informational purposes only. Not financial advice.
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <a href="#faq" style={{ fontSize: 12, color: "#9BA8C0", textDecoration: "none" }}>FAQ</a>
          <a href="#pricing" style={{ fontSize: 12, color: "#9BA8C0", textDecoration: "none" }}>Pricing</a>
          <a href="#features" style={{ fontSize: 12, color: "#9BA8C0", textDecoration: "none" }}>Features</a>
          <a href="/privacy" style={{ fontSize: 12, color: "#9BA8C0", textDecoration: "none" }}>Privacy</a>
          <a href="/terms" style={{ fontSize: 12, color: "#9BA8C0", textDecoration: "none" }}>Terms</a>
        </div>
      </footer>
    </div>
  );
}
