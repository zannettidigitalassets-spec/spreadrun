<!--
DRAFT for owner approval. NOT live. Do not wire into /terms until approved.
Drafted 2026-10-02. Part B is the current SecondRing Terms (last updated September 30, 2026), copied word for word
from src/Terms.jsx, including the SMS Terms section the carrier registration relies on.
Decisions for the owner are marked [DECISION].
-->

# Terms of Service

Last updated: [DATE OF APPROVAL]

These Terms of Service ("Terms") are an agreement between you and the operator of spreadrun.com ("we," "us," "our"). They have two parts:

- **Part A** covers SpreadRun: the data-validation APIs, the free test forms, accounts, API keys and prepaid credits.
- **Part B** covers SecondRing, a missed-call text-back service that is currently paused. Part B is unchanged from SecondRing's Terms.

By using a service covered by these Terms you agree to the part that applies to it. If you do not agree, do not use the service.

## Part A: SpreadRun APIs

### Who can use SpreadRun

SpreadRun is for businesses and professionals. You must be at least 18 and able to form a binding contract. If you use SpreadRun for an organization, you confirm you are authorized to bind it. You are responsible for everything done under your account and with your API keys.

### What the APIs do

Each SpreadRun API checks submitted data against a documented set of rules and returns a report. Reports are structural quality checks. They are not legal, regulatory, compliance, medical or clinical advice, and a passing report does not mean your data or your organization is compliant with any law or rule, or that the data is accurate, complete, current or authentic. What each API checks, and does not check, is described on its product and documentation pages.

Some APIs inspect only part of a large submission. When that happens the report says so, and anything not inspected is not validated.

### Your account and API keys

Keep your API keys secret. Anyone with your key can make calls that use your credits. Revoke a key on your account page if you think it has been exposed; calls with a revoked key stop working. We are not responsible for credits used with your key before you revoke it.

### Prepaid credits and charges

- You buy credits in advance through Stripe. Current packs and the price per call are shown on the pricing page and your account page.
- A call is charged when it completes and returns a report, whatever the report's result (for example PASS, WARN or FAIL). Requests rejected before a report is produced (such as invalid input) are not charged. The documentation describes which requests count as completed for each API.
- If your balance is too low for a call, the report is not returned and nothing is charged.
- Credits never expire. Credits cannot be transferred between accounts or exchanged for cash, except as stated below.
- [DECISION: refunds. Suggested: "Unused credits are refundable on request within 30 days of purchase. After that, purchases are non-refundable except where required by law or where we made a billing error." Alternative: no refunds except billing errors.]
- Prices exclude any taxes we are required to collect. We may change prices or packs; changes do not reduce credits you already bought, and a change to the price per call applies to calls made after the change is posted.

### Free test forms

Test forms on product pages are free, limited in size and number of runs, and may be changed or withdrawn at any time.

### Your data

You keep ownership of the data you submit. You give us permission to process it only to produce your report. We do not store submitted data or reports (see the Privacy Policy). You are responsible for having the rights and permissions needed to submit the data.

Do not submit protected health information, data that identifies patients or other individuals, or other personal data. The APIs are designed for public, aggregate or de-identified data such as price files and study-level trial tables. [DECISION: confirm this restriction; it keeps SpreadRun outside HIPAA business-associate territory.]

### Acceptable use

You agree not to misuse the APIs, including by attempting to gain unauthorized access, interfering with the service or its security, circumventing limits or billing, sending malicious content, reselling access without our permission, or using the service for any unlawful purpose. We may suspend keys or accounts that do.

### Third-party services

Payments are processed by Stripe. SpreadRun is independent of and not endorsed by CMS, ClinicalTrials.gov or any government agency. References to their tools, specifications and data are for context.

### Availability and changes

We may change, suspend or discontinue an API. If we discontinue all APIs, we will refund unused credits. We will give notice of material changes on the site or by email where practical.

### Disclaimers

The APIs, reports and test forms are provided "as is" and "as available," without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, accuracy and non-infringement, to the fullest extent permitted by law. We do not warrant that the service will be uninterrupted or error-free, or that a report will detect every problem.

### Limitation of liability

To the fullest extent permitted by law, we will not be liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits or revenue, regulatory penalties, or decisions made on the basis of a report. Our total liability for any claim relating to SpreadRun is limited to the amount you paid us for credits in the three months before the event giving rise to the claim. You agree to indemnify us against claims arising from data you submit or your use of the service in violation of these Terms or applicable law.

### Termination

You may stop using SpreadRun at any time. We may suspend or end your access if you breach these Terms or if required by law.

## Part B: SecondRing (paused)

SecondRing is paused. Its website and early access list remain available at spreadrun.com/secondring. The following are SecondRing's Terms, unchanged. In Part B, "the Service" means SecondRing.

These Terms of Service ("Terms") are an agreement between you and SecondRing ("we," "us," "our"). They govern your use of SecondRing, a service that automatically sends a text message to people who call your business and are not answered, and gives you an inbox to continue those conversations (the "Service"). By creating an account or using the Service you agree to these Terms. If you do not agree, do not use the Service.

#### Who can use SecondRing

SecondRing is for businesses. You must be at least 18, able to form a binding contract, and using the Service for a business you own or are authorized to act for. You are responsible for everything done under your account.

#### What the Service does

You connect a business phone number to SecondRing (for example, by forwarding missed calls to a number we provide). When a call to your business goes unanswered, SecondRing sends a text message to the caller from your business's SecondRing number, using wording you control. Replies from the caller appear in your SecondRing inbox, where you can answer them. You can also set after-hours messages and tag conversations.

We work to deliver messages quickly and reliably, but delivery depends on phone carriers and other third parties we do not control. We do not guarantee that any call will trigger a text, that any text will be delivered, or that delivery will happen within any particular time.

#### SMS Terms

When SecondRing sends a text to someone who called your business, that text is sent on your behalf, to respond to the call they placed to you. You are the sender of those messages and are responsible for using the Service in compliance with applicable law, including the Telephone Consumer Protection Act (TCPA), CTIA messaging guidelines, carrier rules, and state laws on texting. You agree that you will:
- Use the Service only to respond to people who contacted your business, and only about their inquiry, such as scheduling, quoting, or following up on the job they called about.
- Not use the Service to send marketing or promotional messages, to message people who have not contacted you, or to send unlawful, deceptive, harassing, or prohibited content.
- Honor opt-outs. If a person replies STOP (or a similar opt-out word), SecondRing stops texting them from your number, and you must not try to message them another way through the Service.
- Set your business voicemail greeting to the script SecondRing recommends, which tells callers that they may get a follow-up text and can reply STOP to opt out. SecondRing requires this step during onboarding because the greeting is the caller's notice before we text them.
- Accurately identify your business in your messages and in any information you provide for carrier registration.
- Give us truthful registration information. Carriers and messaging providers require every business number to be registered, and they may reject, suspend, or block a registration or number. We are not responsible for carrier decisions.

We may suspend or limit messaging, or your account, if we believe messages violate these Terms, the law, or carrier requirements, or if we receive complaints.

For the texts SecondRing sends to you (such as account, billing, and service notices), you consent to receive them by providing your mobile number. Message frequency varies. Standard message and data rates may apply. Reply STOP to opt out or HELP for help at any time. See our [Privacy Policy](/privacy) for how we handle SMS opt-in data.

#### Free trial

New accounts get a 14-day free trial. The trial does not require a credit card or any other payment method. When the trial ends, you will need to choose a paid plan to keep using the Service. If you do not, your account becomes read-only or locked and messaging stops. We may delete your data after your trial ends. Each business is limited to one free trial, and we may decline a trial if we suspect abuse.

#### Plans, billing and renewal

SecondRing is offered as a monthly subscription. Current plans and prices are shown on our pricing page and at checkout (currently Solo at $19 per month and Shop at $29 per month, in U.S. dollars). Each plan includes the phone numbers and monthly text volume described on the pricing page. Prices exclude any taxes we are required to collect.

Payments are processed by Stripe. By subscribing you authorize us, through Stripe, to charge your payment method each month until you cancel. Subscriptions renew automatically on the same date each month. If a payment fails, we may retry it, notify you, and suspend the Service until the balance is paid.

We may change prices or plan features. We will give you notice before a change affects your subscription, and you may cancel before the change takes effect.

#### Cancellation and refunds

You can cancel at any time from your Account page (which opens the Stripe billing portal) or by contacting us. Cancellation takes effect at the end of your current paid month; you keep access and messaging until then, and you will not be charged again. We do not provide refunds or credits for partial months, unused time, or unused messages, except where required by law or where we made a billing error. We may delete your data after your subscription ends.

#### Your data

You keep ownership of your business information and of the conversations in your inbox. You give us permission to process that data to operate the Service, as described in our [Privacy Policy](/privacy). You are responsible for having any rights and permissions needed for the information you put into the Service.

#### Acceptable use

You agree not to misuse the Service, including by sending spam or unlawful content, attempting to gain unauthorized access, interfering with the Service or its security, reselling it without our permission, or using it for any unlawful purpose.

#### Third-party services

The Service relies on third parties such as phone carriers, messaging providers, and payment processors. SecondRing is independent of and not endorsed by Google or any advertising platform. References to Google Local Services Ads are for context only, and we do not control how any platform bills or ranks you.

#### No guarantee of results

SecondRing is a tool. It does not guarantee that you will win any job, recover any lead, or reduce any advertising charge.

#### Intellectual property

The Service, including its software, design, and content (excluding your data), belongs to us and our licensors. We give you a limited, non-exclusive, non-transferable right to use it for your business while you are subscribed or on trial.

#### Disclaimers

The Service is provided "as is" and "as available," without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, and non-infringement, to the fullest extent permitted by law. We do not warrant that the Service will be uninterrupted, error-free, or that messages will always be delivered.

#### Limitation of liability

To the fullest extent permitted by law, we will not be liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits, lost jobs, or lost revenue, arising from your use of the Service. Our total liability for any claim relating to the Service is limited to the amount you paid us in the three months before the event giving rise to the claim. You agree to indemnify us against claims arising from messages you send through the Service in violation of these Terms or applicable law.

#### Termination

You may stop using the Service at any time. We may suspend or end your access if you breach these Terms, if required by law or a carrier, or if we discontinue the Service, in which case we will refund any prepaid, unused time.

#### Changes to these Terms

We may update these Terms. If a change is material, we will notify you by email or in the Service before it takes effect. Continuing to use the Service after a change means you accept the updated Terms.

#### Contact us

Questions about these Terms? Use our [contact page](/contact) or email spreadrun@gmail.com.

## Changes to these Terms

We may update these Terms. If a change is material, we will notify account holders by email or on the site before it takes effect. Continuing to use a service after a change means you accept the updated Terms.

## Contact us

Questions about these Terms? Use our [contact page](/contact) or email spreadrun@gmail.com.
