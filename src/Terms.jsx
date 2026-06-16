const SectionTitle = ({ children }) => (
  <h2 style={{ fontSize: 20, fontWeight: 800, margin: "32px 0 12px", letterSpacing: "-0.3px" }}>{children}</h2>
);

const P = ({ children }) => (
  <p style={{ fontSize: 15, color: "#3D4F6E", lineHeight: 1.7, margin: "0 0 16px" }}>{children}</p>
);

export default function Terms() {
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
        <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-0.8px", margin: "0 0 8px" }}>Terms of Service</h1>
        <p style={{ fontSize: 13, color: "#9BA8C0", marginBottom: 40 }}>Last updated: June 2026</p>

        <P>By accessing or using SpreadRun ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.</P>

        <SectionTitle>Not Financial or Legal Advice</SectionTitle>
        <P>SpreadRun provides calculators and tools for informational and educational purposes only. Nothing on this Service constitutes financial, legal, tax, or investment advice. All calculations are estimates based on the figures you enter and should not be relied upon as the sole basis for any investment, financing, or purchasing decision. We strongly recommend consulting a licensed financial advisor, mortgage professional, accountant, or attorney before making real estate investment decisions.</P>

        <SectionTitle>Accuracy of Information</SectionTitle>
        <P>While we strive for accuracy in our calculations, we make no warranties or guarantees regarding the completeness, reliability, or accuracy of any results produced by the Service. Real estate financing terms, lender requirements, and market conditions change frequently and may not be reflected in our tools.</P>

        <SectionTitle>Use of the Service</SectionTitle>
        <P>You may use SpreadRun's free tools for personal or business evaluation of real estate deals. You agree not to misuse the Service, attempt to disrupt its operation, or use it for any unlawful purpose.</P>

        <SectionTitle>Paid Plans</SectionTitle>
        <P>Certain features require a paid subscription ("Starter" or "Pro"). Subscriptions renew automatically on a monthly basis until cancelled. You may cancel at any time, and your access to paid features will continue until the end of your current billing period. We do not offer refunds for partial billing periods except where required by law.</P>

        <SectionTitle>Affiliate Relationships</SectionTitle>
        <P>SpreadRun may participate in affiliate marketing programs and may earn a commission when you click on or engage with certain third-party links, including mortgage and lending partners. This does not affect the price you pay for any third-party product or service, and our calculators and deal signals are not influenced by affiliate relationships.</P>

        <SectionTitle>Intellectual Property</SectionTitle>
        <P>All content, design, and code on SpreadRun, excluding data you input, is the property of SpreadRun and may not be copied, reproduced, or distributed without permission.</P>

        <SectionTitle>Limitation of Liability</SectionTitle>
        <P>SpreadRun is provided "as is" without warranties of any kind. We are not liable for any losses, damages, or decisions made based on the use of this Service, including but not limited to financial losses related to real estate investment decisions.</P>

        <SectionTitle>Changes to These Terms</SectionTitle>
        <P>We may update these Terms from time to time. Continued use of the Service after changes are posted constitutes acceptance of the revised Terms.</P>

        <SectionTitle>Contact Us</SectionTitle>
        <P>If you have questions about these Terms, please reach out through our site.</P>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #EBF0FF" }}>
          <a href="/" style={{ fontSize: 13, fontWeight: 700, color: "#0B5FFF", textDecoration: "none" }}>← Back to SpreadRun</a>
        </div>
      </div>
    </div>
  );
}
