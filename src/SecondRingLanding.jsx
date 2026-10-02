import { useState, useEffect } from "react";
import { setPageMeta } from "./seo.js";
import { useAuth, AuthModal, UserMenu } from "./Auth.jsx";
import EarlyAccessModal from "./EarlyAccessModal.jsx";
import { TRIAL_LIVE, SITE_TITLE, META_DESCRIPTION } from "./launchConfig.js";

// Landing page copy is taken verbatim from SECONDRING_LANDING_COPY.md (draft v1).

const C = {
  ink: "#0D1B3E",
  body: "#2B3A5C",
  muted: "#6B7A99",
  accent: "#0B5FFF",
  tint: "#F0F4FF",
  line: "#D6DFFF",
};

// TRIAL_LIVE lives in launchConfig.js. While false: every CTA is "Get early access" (name + email is stored,
// no trial or account starts), the pricing line and meta description use early-access wording, and Sign in is hidden.

const GUIDE_PATH = "/guides/lsa-missed-call-charges-october-2026";

const STATS = [
  { big: "$8.2B", text: "a year lost by plumbers to missed calls.", src: "PHCC / Waverly Research, Sept 2026" },
  { big: "91%", text: "of emergency jobs go to the first contractor who answers." },
  { big: "58%", text: "of calls are missed by the average shop." },
];

const STEPS = [
  { n: "1", title: "You miss a call.", text: "You're on a job, on a ladder, under a sink. It happens." },
  { n: "2", title: "They get a text in seconds.", text: "“Sorry we missed you, what do you need help with?” Sent automatically, from your business number." },
  { n: "3", title: "You reply when you're free.", text: "Everything lands in one simple inbox. Tag the lead, book the job, move on." },
];

const FEATURES = [
  ["Instant text-back", "Every missed call gets a text in under 60 seconds, automatically."],
  ["Your own number", "Texts come from your business number, not some app."],
  ["One inbox", "Every conversation in one place. No digging through personal texts."],
  ["Lead tagging", "New, quoted, booked, lost. Know where every caller stands."],
  ["After-hours rules (Shop)", "Different message and routing after 6pm, automatically."],
  ["No new hardware, no number changes", "Works with the number on your truck."],
];

const FAQ = [
  ["Does this replace my phone number?", "No. Your number stays. Missed calls forward to SecondRing only when you don't pick up. It's conditional forwarding, set up in minutes."],
  ["Do I need to install anything on my phone?", "No. The inbox lives in your browser. Texts go out automatically whether your phone is on or off."],
  ["What about spam rules (10DLC)?", "Handled. Every number is registered compliantly as part of onboarding, so you don't have to deal with it."],
  ["What if I already use Jobber / HighLevel / Housecall Pro?", "Keep them. SecondRing does one thing those platforms charge $49–197/mo for, at $19. It sits alongside whatever you run."],
  ["Can I cancel?", "Anytime, in two clicks, from your account page. Your number and data stay yours."],
];

const PLANS = [
  { name: "Solo", price: "$19", blurb: "1 number, 300 texts/mo. For the owner-operator.", id: "solo" },
  { name: "Shop", price: "$29", blurb: "3 numbers, 1,000 texts/mo, after-hours rules. For the 2–8 person crew.", id: "shop" },
];

const wrap = { maxWidth: 1040, margin: "0 auto", padding: "0 20px" };

function Cta({ children, onClick, large }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: C.accent, color: "#fff", border: "none", borderRadius: 10,
        padding: large ? "16px 30px" : "11px 20px", fontSize: large ? 17 : 15,
        fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

export default function SecondRingLanding() {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showEarly, setShowEarly] = useState(false);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    setPageMeta(SITE_TITLE, META_DESCRIPTION, "/secondring");
  }, []);

  const start = () => {
    if (!TRIAL_LIVE) {
      if (window.gtag) window.gtag("event", "early_access_cta_click", { source: "landing" });
      setShowEarly(true);
      return;
    }
    if (window.gtag) window.gtag("event", "trial_cta_click", { source: "landing" });
    // Trial signup flow (A4) is not built yet: for now this opens sign-in.
    setShowAuth(true);
  };
  const ctaLabel = TRIAL_LIVE ? "Start your 14-day free trial" : "Get early access";
  const ctaLabelShort = TRIAL_LIVE ? "Start free trial" : "Get early access";

  const scrollTo = (id) => (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{ fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif", color: C.body, background: "#fff", lineHeight: 1.6 }}>
      {/* Paused notice (2026-10-02): SecondRing is shelved; the page and early access list stay live. */}
      <div style={{ background: "#FFF6DB", color: "#5C4400", fontSize: 14, padding: "10px 20px", textAlign: "center", borderBottom: "1px solid #F0DFA6" }}>
        SecondRing is paused. Early access signups are still open, and we will email the list if it launches.
      </div>
      {/* News bar */}
      <div style={{ background: C.ink, color: "#DCE6FF", fontSize: 14, padding: "10px 20px", textAlign: "center" }}>
        As of October 1, 2026, Google charges Local Services advertisers for missed calls over 20 seconds, even the ones that never connected. You can end up paying for calls nobody answered. SecondRing texts every one of those callers back.{" "}
        <a href={GUIDE_PATH} style={{ color: "#fff", fontWeight: 700 }}>Learn more</a>
      </div>

      {/* Nav */}
      <header style={{ borderBottom: `1px solid ${C.line}` }}>
        <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <a href="/secondring" style={{ fontWeight: 800, fontSize: 20, color: C.ink, textDecoration: "none", letterSpacing: "-0.4px" }}>SecondRing</a>
          <nav style={{ display: "flex", alignItems: "center", gap: 22, fontSize: 15, fontWeight: 600 }}>
            <a href="#product" onClick={scrollTo("product")} style={{ color: C.body, textDecoration: "none" }}>Product</a>
            <a href="#pricing" onClick={scrollTo("pricing")} style={{ color: C.body, textDecoration: "none" }}>Pricing</a>
            <a href="#faq" onClick={scrollTo("faq")} style={{ color: C.body, textDecoration: "none" }}>FAQ</a>
            {TRIAL_LIVE && !loading && !user && (
              <button onClick={() => setShowAuth(true)} style={{ background: "none", border: `1.5px solid ${C.line}`, borderRadius: 8, padding: "7px 14px", fontWeight: 700, color: C.ink, cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>Sign in</button>
            )}
            {!loading && user && <UserMenu user={user} />}
          </nav>
        </div>
      </header>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {showEarly && <EarlyAccessModal onClose={() => setShowEarly(false)} />}

      {/* Hero */}
      <section style={{ ...wrap, padding: "72px 20px 56px", textAlign: "center" }}>
        <h1 style={{ color: C.ink, fontSize: "clamp(34px, 6vw, 56px)", lineHeight: 1.08, letterSpacing: "-1.5px", margin: "0 auto 20px", maxWidth: 820 }}>
          Every missed call is a job that went to your competitor.
        </h1>
        <p style={{ fontSize: 20, maxWidth: 680, margin: "0 auto 32px", color: C.body }}>
          SecondRing texts every missed caller back in under 60 seconds, from your own business number, so the job stays yours.
        </p>
        <Cta large onClick={start}>{ctaLabel}</Cta>
        <p style={{ fontSize: 14, color: C.muted, marginTop: 14 }}>No hardware. No new number to hand out. Cancel anytime.</p>
      </section>

      {/* Problem */}
      <section style={{ background: C.tint, padding: "56px 0" }}>
        <div style={wrap}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {STATS.map((s) => (
              <div key={s.big} style={{ background: "#fff", borderRadius: 14, padding: 24, border: `1px solid ${C.line}` }}>
                <div style={{ fontSize: 40, fontWeight: 800, color: C.accent, letterSpacing: "-1px" }}>{s.big}</div>
                <div style={{ color: C.ink, fontWeight: 600 }}>{s.text}</div>
                {s.src && <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>({s.src})</div>}
              </div>
            ))}
          </div>
          <p style={{ maxWidth: 720, margin: "32px auto 0", textAlign: "center", fontSize: 18 }}>
            You can't answer from under a sink. Your competitor can answer from their couch. What matters is what happens in the 60 seconds after the call you missed.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="product" style={{ ...wrap, padding: "64px 20px 24px" }}>
        <h2 style={{ color: C.ink, fontSize: 32, letterSpacing: "-0.6px", textAlign: "center", margin: "0 0 36px" }}>How it works</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
          {STEPS.map((s) => (
            <div key={s.n}>
              <div style={{ width: 36, height: 36, borderRadius: 99, background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, marginBottom: 12 }}>{s.n}</div>
              <div style={{ color: C.ink, fontWeight: 800, fontSize: 18, marginBottom: 4 }}>{s.title}</div>
              <div>{s.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ ...wrap, padding: "40px 20px 64px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {FEATURES.map(([t, d]) => (
            <div key={t} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 20 }}>
              <div style={{ color: C.ink, fontWeight: 800, marginBottom: 4 }}>{t}</div>
              <div style={{ fontSize: 15 }}>{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ background: C.tint, padding: "64px 0" }}>
        <div style={{ ...wrap, textAlign: "center" }}>
          <h2 style={{ color: C.ink, fontSize: 32, letterSpacing: "-0.6px", margin: "0 0 8px" }}>Pricing</h2>
          <p style={{ fontWeight: 700, color: C.ink, margin: "0 0 28px" }}>{TRIAL_LIVE ? "14-day free trial. Full product. No credit card." : "Launching soon. Join the early access list."}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, maxWidth: 680, margin: "0 auto" }}>
            {PLANS.map((p) => (
              <div key={p.id} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 28 }}>
                <div style={{ color: C.ink, fontWeight: 800, fontSize: 20 }}>{p.name}</div>
                <div style={{ fontSize: 40, fontWeight: 800, color: C.ink, letterSpacing: "-1px" }}>{p.price}<span style={{ fontSize: 16, color: C.muted, fontWeight: 600 }}>/mo</span></div>
                <div style={{ margin: "8px 0 20px" }}>{p.blurb}</div>
                <Cta onClick={start}>{ctaLabelShort}</Cta>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 24, fontWeight: 700, color: C.ink }}>One recovered job pays for a year.</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ maxWidth: 760, margin: "0 auto", padding: "64px 20px" }}>
        <h2 style={{ color: C.ink, fontSize: 32, letterSpacing: "-0.6px", textAlign: "center", margin: "0 0 28px" }}>FAQ</h2>
        {FAQ.map(([q, a], i) => (
          <div key={q} style={{ borderBottom: `1px solid ${C.line}` }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
              style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "18px 0", fontFamily: "inherit", fontSize: 17, fontWeight: 700, color: C.ink, cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 12 }}
            >
              <span>{q}</span><span aria-hidden="true">{open === i ? "−" : "+"}</span>
            </button>
            {open === i && <p style={{ margin: "0 0 18px" }}>{a}</p>}
          </div>
        ))}
      </section>

      {/* Final CTA */}
      <section style={{ background: C.ink, color: "#fff", padding: "64px 20px", textAlign: "center" }}>
        <h2 style={{ fontSize: 30, letterSpacing: "-0.5px", margin: "0 auto 24px", maxWidth: 640 }}>
          You're going to miss another call. Make sure they hear back.
        </h2>
        <Cta large onClick={start}>{ctaLabel}</Cta>
      </section>

      <footer style={{ ...wrap, padding: "24px 20px 40px", fontSize: 13, color: C.muted, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <span>SecondRing</span>
        <a href="/privacy" style={{ color: C.muted }}>Privacy</a>
        <a href="/terms" style={{ color: C.muted }}>Terms</a>
        <a href="/contact" style={{ color: C.muted }}>Contact</a>
      </footer>
    </div>
  );
}
