import LegalPage, { SectionTitle, P, UL } from './legal/LegalPage.jsx';

// Approved 2026-10-02 from docs/legal-drafts/privacy-DRAFT.md with the owner's decisions applied:
// brand-only operator wording, and no protected health information or personal data in submissions.
export const UPDATED = 'October 2, 2026';

export default function Privacy() {
  return (
    <LegalPage path="/privacy" title="Privacy Policy" updated={UPDATED}>
      <P>This Privacy Policy explains what SpreadRun ("we," "us," "our") collects when you use spreadrun.com, the SpreadRun data-validation APIs (including the free test forms), accounts, API keys and credit purchases, how we use it, and the choices you have.</P>

      <SectionTitle>Who this covers</SectionTitle>
      <UL>
        <li><strong>Account holders:</strong> people who sign in to create API keys, buy credits or view usage.</li>
        <li><strong>API callers:</strong> systems calling our APIs with an account holder's key.</li>
        <li><strong>Test-form users:</strong> people who run the free test form on a product page without an account.</li>
        <li><strong>Website visitors and people who contact us.</strong></li>
      </UL>

      <SectionTitle>Information we collect</SectionTitle>
      <P><strong>Account information:</strong> the email address you sign in with. Sign-in uses a one-time code sent to that email; we do not use passwords.</P>
      <P><strong>API keys:</strong> when you create a key we show it to you once and store only a one-way hash of it, a short prefix so you can recognize it, its name, and when it was created, last used and revoked.</P>
      <P><strong>Purchases:</strong> when you buy credits, Stripe collects and stores your payment details; we do not see or store full card numbers. We keep your Stripe customer identifier, the pack you bought, the amount paid, and your credit balance and credit history.</P>
      <P><strong>Data you submit for validation:</strong> the tables or files you send to an API or test form are processed in memory only for the length of the request, to produce the report. We do not store them, and we do not store the reports. Reports are designed not to repeat values from your data.</P>
      <P><strong>No health or personal data, please.</strong> The APIs are not intended for protected health information (PHI), and SpreadRun is not a HIPAA business associate. Do not submit PHI, data that identifies patients, or any other personal data. The APIs are built for public, aggregate or de-identified data such as hospital price files and study-level trial tables. See the <a href="/terms">Terms</a>.</P>
      <P>For the UAD 3.6 Appraisal Report Validator, SpreadRun processes personal data contained in appraisal reports (such as borrower, owner, and seller names and property addresses) in memory only to produce the validation report. It is not stored.</P>
      <P>For the PBJ Staffing Data Pre-Submission QA, SpreadRun processes personal data contained in PBJ staffing files (such as employee identifiers, hire and termination dates, and hours worked) in memory only to produce the validation report. It is not stored.</P>
      <P>For the Davis-Bacon WH-347 Certified Payroll Pre-Check, SpreadRun processes personal data contained in certified payrolls (such as worker names, individual identifying numbers, hours worked, pay and deductions) in memory only to produce the validation report. It is not stored. If you ask for a completed WH-347 form, it is also produced in memory only, returned to you in the same response, and not stored.</P>
      <P><strong>Usage records:</strong> for each API request we record the time, which API was called, whether it was a paid call or a test-form run, the outcome (for example completed or rejected as invalid input), the report's status (PASS, WARN or FAIL), the request size, how long it took, the amount charged, and for paid calls the account and key used. These records never contain the submitted data.</P>
      <P><strong>Test-form rate limiting:</strong> for test-form runs we store a salted one-way hash of the network address the request came from, with a daily count, so we can limit free runs. We do not store the address itself.</P>
      <P><strong>Contact form:</strong> your name, email and message, delivered to us through Formspree.</P>
      <P><strong>Website visitors:</strong> basic usage data such as pages viewed, browser and device type, and approximate location, collected through Google Analytics and similar technologies.</P>

      <SectionTitle>How we use information</SectionTitle>
      <UL>
        <li>To run the APIs and test forms, check API keys, and charge completed runs against your credits.</li>
        <li>To process credit purchases and refunds, send receipts, and show your balance, keys and usage on your account page.</li>
        <li>To prevent abuse, enforce limits, and keep the service secure.</li>
        <li>To measure how the service is used (for example how many test runs, sign-ups, purchases and paid calls there are) and improve it.</li>
        <li>To reply when you contact us.</li>
      </UL>
      <P>We do not sell personal information, and we do not use submitted data for any purpose other than producing your report.</P>

      <SectionTitle>Who we share information with</SectionTitle>
      <UL>
        <li><strong>Service providers</strong> that process data for us: Stripe (payments), Supabase (database and sign-in), Resend (email), Vercel (hosting and request processing), Formspree (contact form) and Google Analytics (site analytics). They may use the data only to provide their services to us.</li>
        <li><strong>Authorities and others</strong> when required by law or to protect rights, safety, or the security of the service, or in connection with a business transfer such as a merger or sale.</li>
      </UL>

      <SectionTitle>Retention</SectionTitle>
      <P>We keep your account, keys, credit history and usage records while your account is active, and afterwards for as long as we need them for billing, tax, security and legal reasons. Test-form rate-limit counters are kept only as long as needed to prevent abuse. Submitted data is not retained. You can ask us to delete your account at any time.</P>

      <SectionTitle>Security</SectionTitle>
      <P>We use reasonable technical and organizational measures to protect your information, including encryption in transit, hashed API keys, and access controls on our database. No system is perfectly secure, and we cannot guarantee absolute security.</P>

      <SectionTitle>Your choices and rights</SectionTitle>
      <P>You can access, correct, export, or delete your information by contacting us. You can revoke API keys at any time on your account page. Depending on where you live, you may have additional rights under local privacy laws; we will honor valid requests as required.</P>

      <SectionTitle>Cookies and analytics</SectionTitle>
      <P>We use browser storage for sign-in and cookies to measure site usage with Google Analytics. You can block or delete cookies in your browser settings, though some features may not work.</P>

      <SectionTitle>Children</SectionTitle>
      <P>SpreadRun is for businesses and professionals and are not directed to children under 13. We do not knowingly collect information from children.</P>

      <SectionTitle>Changes to this policy</SectionTitle>
      <P>We may update this policy. If a change is material we will notify account holders by email or on the site. The date at the top shows when it was last updated.</P>
      <SectionTitle>Contact us</SectionTitle>
      <P>Questions or requests: <a href="mailto:spreadrun@gmail.com">spreadrun@gmail.com</a> or our <a href="/contact">contact page</a>.</P>
    </LegalPage>
  );
}
