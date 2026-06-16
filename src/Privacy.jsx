const SectionTitle = ({ children }) => (
  <h2 style={{ fontSize: 20, fontWeight: 800, margin: "32px 0 12px", letterSpacing: "-0.3px" }}>{children}</h2>
);

const P = ({ children }) => (
  <p style={{ fontSize: 15, color: "#3D4F6E", lineHeight: 1.7, margin: "0 0 16px" }}>{children}</p>
);

export default function Privacy() {
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
        <a href="/app" style={{
          background: "#0B5FFF", color: "#fff", fontSize: 13, fontWeight: 700,
          padding: "8px 18px", borderRadius: 8, textDecoration: "none",
        }}>Try Free →</a>
      </nav>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "60px 24px 100px" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#0B5FFF", textTransform: "uppercase", marginBottom: 12 }}>Legal</div>
        <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-0.8px", margin: "0 0 8px" }}>Privacy Policy</h1>
        <p style={{ fontSize: 13, color: "#9BA8C0", marginBottom: 40 }}>Last updated: June 2026</p>

        <P>SpreadRun ("we," "our," or "us") operates spreadrun.com (the "Service"). This Privacy Policy explains how we collect, use, and protect information when you use our Service.</P>

        <SectionTitle>Information We Collect</SectionTitle>
        <P>We collect information in the following ways:</P>
        <P><strong>Information you provide:</strong> When you sign up for early access or a paid plan, we collect your email address and any other information you voluntarily submit through our forms.</P>
        <P><strong>Usage data:</strong> We use Google Analytics to understand how visitors use our Service, including pages viewed, time spent, and general location (city/country level, not precise location). We do not collect or store the specific property addresses or financial figures you enter into our calculators — those calculations happen in your browser and are not transmitted to or stored on our servers unless you explicitly save a deal using a paid feature.</P>
        <P><strong>Cookies:</strong> We use cookies and similar technologies through Google Analytics and Google AdSense to understand site usage and serve relevant advertising.</P>

        <SectionTitle>How We Use Your Information</SectionTitle>
        <P>We use the information we collect to operate and improve the Service, respond to your inquiries, send updates about new features (only if you've signed up for early access), and display relevant advertising through Google AdSense.</P>

        <SectionTitle>Third-Party Services</SectionTitle>
        <P>We use the following third-party services, each with their own privacy practices:</P>
        <P><strong>Google Analytics:</strong> to understand site traffic and usage patterns.</P>
        <P><strong>Google AdSense:</strong> to display advertising. Google may use cookies to serve ads based on your visits to this and other websites. You can learn more and opt out of personalized advertising at <a href="https://adssettings.google.com" style={{ color: "#0B5FFF" }}>Google's Ads Settings</a>.</P>
        <P><strong>Formspree:</strong> to process email signups submitted through our forms.</P>
        <P><strong>Vercel:</strong> our hosting provider, which may collect standard server logs (IP address, browser type) for security and performance purposes.</P>
        <P>We may also participate in affiliate marketing programs. If you click a link to a third-party lender or financial service from our Service, that company's own privacy policy will govern any information you provide to them directly.</P>

        <SectionTitle>Data Retention</SectionTitle>
        <P>We retain email addresses collected for early access until you ask us to delete them. Saved deal data for paid accounts is retained for as long as your account is active.</P>

        <SectionTitle>Your Rights</SectionTitle>
        <P>You may request access to, correction of, or deletion of your personal information at any time by contacting us using the information below.</P>

        <SectionTitle>Children's Privacy</SectionTitle>
        <P>Our Service is not directed to individuals under 18. We do not knowingly collect personal information from children.</P>

        <SectionTitle>Changes to This Policy</SectionTitle>
        <P>We may update this Privacy Policy from time to time. We will post any changes on this page with an updated revision date.</P>

        <SectionTitle>Contact Us</SectionTitle>
        <P>If you have questions about this Privacy Policy, please reach out through our site.</P>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #EBF0FF" }}>
          <a href="/" style={{ fontSize: 13, fontWeight: 700, color: "#0B5FFF", textDecoration: "none" }}>← Back to SpreadRun</a>
        </div>
      </div>
    </div>
  );
}
