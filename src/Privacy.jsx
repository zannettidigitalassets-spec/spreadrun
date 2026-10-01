import LegalLayout, { SectionTitle, P, UL, SUPPORT_EMAIL, OPERATOR } from "./LegalLayout.jsx";

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="September 30, 2026">
      <P>This Privacy Policy explains what {OPERATOR} ("SecondRing," "we," "us") collects, how we use it, and the choices you have. It covers our website, the SecondRing app, and the text messages the Service sends and receives.</P>

      <SectionTitle>Who this covers</SectionTitle>
      <UL>
        <li><strong>Our customers</strong> — the contractors and businesses that sign up for SecondRing.</li>
        <li><strong>Callers and texters</strong> — people who call one of our customers' businesses and receive or reply to a SecondRing text.</li>
        <li><strong>Website visitors.</strong></li>
      </UL>

      <SectionTitle>Information we collect</SectionTitle>
      <P><strong>From customers:</strong> email address (used to sign in), business name and details, the phone numbers you connect or we provision for you, your message templates and after-hours settings, and billing information. Payment card details are collected and stored by Stripe; we do not see or store full card numbers. We keep your Stripe customer and subscription identifiers, plan, and billing status.</P>
      <P><strong>From early-access signups:</strong> the name and email you enter on our early-access form. We use it only to tell you when SecondRing launches, and you can ask us to remove it at any time.</P>
      <P><strong>From callers and texters:</strong> the phone number that called, the time of the call, the text messages sent to and received from that number, and any tags or notes the business adds. We collect this on behalf of the business the person called.</P>
      <P><strong>From website visitors:</strong> basic usage data such as pages viewed, browser and device type, and approximate location, collected through Google Analytics and similar technologies.</P>

      <SectionTitle>How we use information</SectionTitle>
      <UL>
        <li>To provide the Service: detect missed calls, send and receive texts, and show conversations in the inbox.</li>
        <li>To manage your account, free trial, subscription, and billing, and to send service and account messages.</li>
        <li>To register your business and phone numbers with carriers and messaging providers, as required to send texts.</li>
        <li>To keep the Service secure, prevent abuse and spam, and comply with legal and carrier requirements.</li>
        <li>To understand how the site is used and improve the Service.</li>
      </UL>
      <P>We do not sell personal information.</P>

      <SectionTitle>Text messaging (SMS) terms</SectionTitle>
      <P><strong>Texts sent to callers.</strong> When someone calls a SecondRing customer's business and the call goes unanswered, SecondRing sends one or more text messages on that business's behalf, in response to the call. These messages are conversational and relate to the person's inquiry (for example, asking what they need help with and arranging a callback or quote). They are not marketing messages. By calling a business and continuing the text conversation, the person is contacting that business and expects a reply.</P>
      <UL>
        <li><strong>Message frequency varies</strong> and depends on the conversation.</li>
        <li><strong>Message and data rates may apply.</strong></li>
        <li><strong>To stop</strong> receiving texts, reply <strong>STOP</strong>. You will receive a confirmation and no further messages from that number. Reply <strong>START</strong> to resume.</li>
        <li><strong>For help</strong>, reply <strong>HELP</strong> or contact us at <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "#0B5FFF" }}>{SUPPORT_EMAIL}</a>.</li>
        <li>Carriers are not liable for delayed or undelivered messages.</li>
      </UL>
      <P><strong>Texts sent to our customers.</strong> If you give us your mobile number, you agree to receive account, billing, and service texts from SecondRing, with the same frequency, rate, STOP, and HELP terms above.</P>
      <P><strong>No sharing of mobile information.</strong> We do not share, sell, or rent phone numbers, text message content, or opt-in/consent information to third parties or affiliates for their marketing or promotional purposes. Mobile information is shared only with the service providers that help us deliver messages and run the Service, as described below, and with the business the person contacted.</P>

      <SectionTitle>Who we share information with</SectionTitle>
      <P>We share information only as needed to run the Service:</P>
      <UL>
        <li><strong>The business</strong> a caller contacted, which owns and can see its own conversations.</li>
        <li><strong>Service providers</strong> that process data for us: Twilio (phone numbers and text delivery), Stripe (payments and billing), Supabase (database and sign-in), Resend (email), Vercel (hosting), and Google Analytics (site analytics). They may use the data only to provide their services to us.</li>
        <li><strong>Authorities and others</strong> when required by law or to protect rights, safety, or the security of the Service, or in connection with a business transfer such as a merger or sale.</li>
      </UL>

      <SectionTitle>Retention</SectionTitle>
      <P>We keep account and conversation data while your account is active. We may delete your data after your trial or subscription ends. You can ask us to delete your data sooner. We may keep limited records longer where needed for billing, tax, security, carrier compliance, or legal reasons.</P>

      <SectionTitle>Security</SectionTitle>
      <P>We use reasonable technical and organizational measures to protect your information, including encryption in transit and access controls on our database. No system is perfectly secure, and we cannot guarantee absolute security.</P>

      <SectionTitle>Your choices and rights</SectionTitle>
      <P>You can access, correct, export, or delete your information by contacting us. Callers and texters can opt out of texts by replying STOP, and can ask us or the business they contacted to delete their conversation. Depending on where you live, you may have additional rights under local privacy laws; we will honor valid requests as required.</P>

      <SectionTitle>Cookies and analytics</SectionTitle>
      <P>We use cookies and similar technologies for sign-in and to measure site usage with Google Analytics. You can block or delete cookies in your browser settings, though some features may not work.</P>

      <SectionTitle>Children</SectionTitle>
      <P>The Service is for businesses and is not directed to children under 13. We do not knowingly collect information from children.</P>

      <SectionTitle>Changes to this policy</SectionTitle>
      <P>We may update this policy. If a change is material we will notify customers by email or in the Service. The date at the top shows when it was last updated.</P>

      <SectionTitle>Contact us</SectionTitle>
      <P>{OPERATOR}. Questions or requests: <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "#0B5FFF" }}>{SUPPORT_EMAIL}</a> or our <a href="/contact" style={{ color: "#0B5FFF" }}>contact page</a>.</P>
    </LegalLayout>
  );
}
