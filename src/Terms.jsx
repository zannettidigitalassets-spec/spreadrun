import LegalPage, { SectionTitle, P, UL } from './legal/LegalPage.jsx';
import { PriceTable } from './pages/Catalog.jsx';

// Approved 2026-10-02 from docs/legal-drafts/terms-DRAFT.md with the owner's decisions applied:
// brand-only operator wording, 30-day refunds on unused credits, and no PHI or personal data in submissions.
export const UPDATED = 'October 5, 2026';

export default function Terms() {
  return (
    <LegalPage path="/terms" title="Terms of Service" updated={UPDATED}>
      <P>These Terms of Service ("Terms") are an agreement between you and SpreadRun ("we," "us," "our"). They cover spreadrun.com, the SpreadRun data-validation APIs, the free test forms, accounts, API keys and prepaid credits. By using SpreadRun you agree to these Terms. If you do not agree, do not use SpreadRun.</P>

      <SectionTitle>Who can use SpreadRun</SectionTitle>
      <P>SpreadRun is for businesses and professionals. You must be at least 18 and able to form a binding contract. If you use SpreadRun for an organization, you confirm you are authorized to bind it. You are responsible for everything done under your account and with your API keys.</P>

      <SectionTitle>What the APIs do</SectionTitle>
      <P>Each SpreadRun API checks submitted data against a documented set of rules and returns a report. Reports are structural quality checks. They are not legal, regulatory, compliance, medical or clinical advice, and a passing report does not mean your data or your organization is compliant with any law or rule, or that the data is accurate, complete, current or authentic. What each API checks, and does not check, is described on its <a href="/apis">product</a> and <a href="/docs">documentation</a> pages.</P>
      <P>Some APIs inspect only part of a large submission. When that happens the report says so, and anything not inspected is not validated.</P>

      <SectionTitle>Your account and API keys</SectionTitle>
      <P>Keep your API keys secret. Anyone with your key can make calls that use your credits. Revoke a key on your account page if you think it has been exposed; calls with a revoked key stop working. We are not responsible for credits used with your key before you revoke it.</P>

      <SectionTitle>Prepaid credits and charges</SectionTitle>
      <UL>
        <li>You buy credits in advance through Stripe. Packs are currently $5, $20, $50 and $100. A pack buys that many cents of credit, and credit works on every SpreadRun API: $5 covers 20 standard runs at $0.25, for example. Each API has its own price per completed report, shown in the table below, on the <a href="/apis#pricing">pricing page</a> and on your account page.</li>
        <li>A call is charged when it completes and returns a report, whatever the report's result (for example PASS, WARN or FAIL). Requests rejected before a report is produced (such as invalid input) are not charged. The documentation describes which requests count as completed for each API.</li>
        <li>If your balance is too low for a call, the report is not returned and nothing is charged.</li>
        <li>Credits never expire. Credits cannot be transferred between accounts or exchanged for cash, except through a refund as described below.</li>
        <li>Prices exclude any taxes we are required to collect. We may change prices or packs; changes do not reduce credits you already bought, and a change to the price per call applies to calls made after the change is posted.</li>
      </UL>

      <SectionTitle>Price per completed report</SectionTitle>
      <PriceTable />

      <SectionTitle>Refunds</SectionTitle>
      <P>If you change your mind, ask us within 30 days of a purchase and we will refund the unused credits from that purchase to your original payment method. Credits you have already spent are not refundable. After 30 days, purchases are non-refundable, except where we made a billing error or where applicable law requires a refund. To ask for a refund, use our <a href="/contact">contact page</a> or email <a href="mailto:spreadrun@gmail.com">spreadrun@gmail.com</a> from the address on your account.</P>

      <SectionTitle>Free test forms</SectionTitle>
      <P>Test forms on product pages are free, limited in size and number of runs, and may be changed or withdrawn at any time.</P>

      <SectionTitle>Your data</SectionTitle>
      <P>You keep ownership of the data you submit. You give us permission to process it only to produce your report. We do not store submitted data or reports (see the <a href="/privacy">Privacy Policy</a>). You are responsible for having the rights and permissions needed to submit the data.</P>

      <SectionTitle>No protected health information or personal data</SectionTitle>
      <P>SpreadRun is not intended for protected health information (PHI), and SpreadRun is not a HIPAA business associate. Your submissions must not contain PHI, data that identifies patients, or any other personal data. The APIs are built for public, aggregate or de-identified data, such as hospital price files and study-level clinical trial tables. If you need to check data that contains PHI, do not use SpreadRun for it.</P>
      <P>Appraisal reports. Files sent to the UAD 3.6 Appraisal Report Validator may contain personal data that appears in an appraisal report, such as names of borrowers, owners and sellers and property addresses. SpreadRun processes them in memory only to produce the report and does not store them. You confirm you are permitted to share them with SpreadRun as a service provider. The PHI prohibition still applies.</P>
      <P>PBJ staffing files. Files sent to the PBJ Staffing Data Pre-Submission QA may contain personal data about a facility's staff that appears in a Payroll Based Journal file, such as employee identifiers, hire and termination dates, and hours worked by date and job title. SpreadRun processes them in memory only to produce the report and does not store them. You confirm you are permitted to share them with SpreadRun as a service provider. Employee identifiers must not be Social Security Numbers or other government identifiers. The PHI prohibition still applies.</P>
      <P>Certified payrolls. Files sent to the Davis-Bacon WH-347 Certified Payroll Pre-Check may contain personal data about workers that appears in a certified payroll, such as worker names, individual identifying numbers, labor classifications, hours worked, pay rates, deductions and net pay. SpreadRun processes them in memory only to produce the report and does not store them. If you ask for a completed WH-347 form, SpreadRun also produces it in memory only, returns it to you in the same response, and does not store it. You confirm you are permitted to share them with SpreadRun as a service provider. Identifying numbers must not be full Social Security Numbers or other government identifiers. The PHI prohibition still applies.</P>
      <P>Medicare enrollment drafts. Drafts sent to the PECOS Medicare Enrollment Pre-Check may contain personal data that appears in a Medicare enrollment application, such as a practitioner's name, National Provider Identifier, and license, certification and DEA registration numbers and dates. SpreadRun processes them in memory only to produce the report and does not store them. To run the registry checks, SpreadRun sends the NPI, and nothing else, to the public NPPES NPI Registry operated by CMS. You confirm you are permitted to share the draft with SpreadRun as a service provider. Social Security Numbers must not be included. The PHI prohibition still applies.</P>
      <P>COBRA notices. Notices sent to the COBRA Notice Content QA may contain personal data that appears in a COBRA notice, such as names of covered employees and family members, addresses and premium amounts. SpreadRun processes them in memory only to produce the report and does not store them. You confirm you are permitted to share them with SpreadRun as a service provider.</P>

      <SectionTitle>Acceptable use</SectionTitle>
      <P>You agree not to misuse the APIs, including by attempting to gain unauthorized access, interfering with the service or its security, circumventing limits or billing, sending malicious content, reselling access without our permission, or using the service for any unlawful purpose. We may suspend keys or accounts that do.</P>

      <SectionTitle>Third-party services</SectionTitle>
      <P>Payments are processed by Stripe. SpreadRun is independent of and not endorsed by CMS, ClinicalTrials.gov or any government agency. References to their tools, specifications and data are for context.</P>

      <SectionTitle>Availability and changes</SectionTitle>
      <P>We may change, suspend or discontinue an API. If we discontinue all APIs, we will refund unused credits. We will give notice of material changes on the site or by email where practical.</P>

      <SectionTitle>Disclaimers</SectionTitle>
      <P>The APIs, reports and test forms are provided "as is" and "as available," without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, accuracy and non-infringement, to the fullest extent permitted by law. We do not warrant that the service will be uninterrupted or error-free, or that a report will detect every problem.</P>

      <SectionTitle>Limitation of liability</SectionTitle>
      <P>To the fullest extent permitted by law, we will not be liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits or revenue, regulatory penalties, or decisions made on the basis of a report. Our total liability for any claim relating to SpreadRun is limited to the amount you paid us for credits in the three months before the event giving rise to the claim. You agree to indemnify us against claims arising from data you submit or your use of the service in violation of these Terms or applicable law.</P>

      <SectionTitle>Termination</SectionTitle>
      <P>You may stop using SpreadRun at any time. We may suspend or end your access if you breach these Terms or if required by law.</P>

      <SectionTitle>Changes to these Terms</SectionTitle>
      <P>We may update these Terms. If a change is material, we will notify account holders by email or on the site before it takes effect. Continuing to use SpreadRun after a change means you accept the updated Terms.</P>
      <SectionTitle>Contact us</SectionTitle>
      <P>Questions about these Terms? Use our <a href="/contact">contact page</a> or email <a href="mailto:spreadrun@gmail.com">spreadrun@gmail.com</a>.</P>
    </LegalPage>
  );
}
