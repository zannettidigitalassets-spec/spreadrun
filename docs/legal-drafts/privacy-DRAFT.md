<!--
SUPERSEDED 2026-10-02: approved and published as src/Privacy.jsx and src/Terms.jsx. Kept for history only.
DRAFT for owner approval. NOT live. Do not wire into /privacy until approved.
Drafted 2026-10-02. Part B is the current SecondRing policy (last updated September 30, 2026), copied word for word
from src/Privacy.jsx, so the URL the carrier registration cites keeps the exact SMS language.
Decisions for the owner are marked [DECISION].
-->

# Privacy Policy

Last updated: [DATE OF APPROVAL]

This Privacy Policy covers spreadrun.com and the services offered on it. It has two parts:

- **Part A** covers SpreadRun: the website, the data-validation APIs (including the free test forms), accounts, API keys and credit purchases.
- **Part B** covers SecondRing, a missed-call text-back service that is currently paused. Part B is unchanged from SecondRing's policy, including its text messaging (SMS) terms.

In this policy, "we," "us" and "our" mean the operator of SpreadRun and SecondRing. [DECISION: confirm brand-only operator wording is acceptable for your situation; no legal name is published here.]

## Part A: SpreadRun

### Who this covers

- **Account holders:** people who sign in to create API keys, buy credits or view usage.
- **API callers:** systems calling our APIs with an account holder's key.
- **Test-form users:** people who run the free test form on a product page without an account.
- **Website visitors and people who contact us.**

### Information we collect

**Account information:** the email address you sign in with. Sign-in uses a one-time code sent to that email; we do not use passwords.

**API keys:** when you create a key we show it to you once and store only a one-way hash of it, a short prefix so you can recognize it, its name, and when it was created, last used and revoked.

**Purchases:** when you buy credits, Stripe collects and stores your payment details; we do not see or store full card numbers. We keep your Stripe customer identifier, the pack you bought, the amount paid, and your credit balance and credit history.

**Data you submit for validation:** the tables or files you send to an API or test form are processed in memory only for the length of the request, to produce the report. We do not store them, and we do not store the reports. Reports are designed not to repeat values from your data. Do not submit protected health information or other personal data; see the Terms.

**Usage records:** for each API request we record the time, which API was called, whether it was a paid call or a test-form run, the outcome (for example completed or rejected as invalid input), the report's status (PASS, WARN or FAIL), the request size, how long it took, the amount charged, and for paid calls the account and key used. These records never contain the submitted data.

**Test-form rate limiting:** for test-form runs we store a salted one-way hash of the network address the request came from, with a daily count, so we can limit free runs. We do not store the address itself.

**Contact form:** your name, email and message, delivered to us through Formspree.

**Website visitors:** basic usage data such as pages viewed, browser and device type, and approximate location, collected through Google Analytics and similar technologies.

### How we use information

- To run the APIs and test forms, authenticate API keys, and charge completed runs against your credits.
- To process credit purchases, send receipts, and show your balance, keys and usage on your account page.
- To prevent abuse, enforce limits, and keep the service secure.
- To measure how the service is used (for example how many test runs, sign-ups, purchases and paid calls there are) and improve it.
- To reply when you contact us.

We do not sell personal information, and we do not use submitted data for any purpose other than producing your report.

### Who we share information with

- **Service providers** that process data for us: Stripe (payments), Supabase (database and sign-in), Resend (email), Vercel (hosting and request processing), Formspree (contact form) and Google Analytics (site analytics). They may use the data only to provide their services to us.
- **Authorities and others** when required by law or to protect rights, safety, or the security of the service, or in connection with a business transfer such as a merger or sale.

### Retention

We keep your account, keys, credit history and usage records while your account is active and afterwards as long as needed for billing, tax, security and legal reasons. Test-form rate-limit counters are kept only as long as needed to prevent abuse. Submitted data is not retained. You can ask us to delete your account. [DECISION: if you want a specific retention period here, a deletion job has to exist first; none is built yet.]

### Security

We use reasonable technical and organizational measures to protect your information, including encryption in transit, hashed API keys, and access controls on our database. No system is perfectly secure, and we cannot guarantee absolute security.

### Your choices and rights

You can access, correct, export, or delete your information by contacting us. You can revoke API keys at any time on your account page. Depending on where you live, you may have additional rights under local privacy laws; we will honor valid requests as required.

### Cookies and analytics

We use browser storage for sign-in and cookies to measure site usage with Google Analytics. You can block or delete cookies in your browser settings, though some features may not work.

### Children

The services are for businesses and professionals and are not directed to children under 13. We do not knowingly collect information from children.

## Part B: SecondRing (paused)

SecondRing is paused. Its website and early access list remain available at spreadrun.com/secondring. The following is SecondRing's privacy policy, unchanged. In Part B, "the Service" means SecondRing.

This Privacy Policy explains what SecondRing ("we," "us," "our") collects, how we use it, and the choices you have. It covers our website, the SecondRing app, and the text messages the Service sends and receives.

#### Who this covers
- **Our customers:** the contractors and businesses that sign up for SecondRing.
- **Callers and texters:** people who call one of our customers' businesses and receive or reply to a SecondRing text.
- **Website visitors.**

#### Information we collect

**From customers:** email address (used to sign in), business name and details, the phone numbers you connect or we provision for you, your message templates and after-hours settings, and billing information. Payment card details are collected and stored by Stripe; we do not see or store full card numbers. We keep your Stripe customer and subscription identifiers, plan, and billing status.

**From early-access signups:** the name and email you enter on our early-access form. We use it only to tell you when SecondRing launches, and you can ask us to remove it at any time.

**From callers and texters:** the phone number that called, the time of the call, the text messages sent to and received from that number, and any tags or notes the business adds. We collect this on behalf of the business the person called.

**From website visitors:** basic usage data such as pages viewed, browser and device type, and approximate location, collected through Google Analytics and similar technologies.

#### How we use information
- To provide the Service: detect missed calls, send and receive texts, and show conversations in the inbox.
- To manage your account, free trial, subscription, and billing, and to send service and account messages.
- To register your business and phone numbers with carriers and messaging providers, as required to send texts.
- To keep the Service secure, prevent abuse and spam, and comply with legal and carrier requirements.
- To understand how the site is used and improve the Service.

We do not sell personal information.

#### Text messaging (SMS) terms

**Texts sent to callers.** When someone calls a SecondRing customer's business and the call goes unanswered, SecondRing sends one or more text messages on that business's behalf, in response to the call. These messages are conversational and relate to the person's inquiry (for example, asking what they need help with and arranging a callback or quote). They are not marketing messages. By calling a business and continuing the text conversation, the person is contacting that business and expects a reply.
- **Message frequency varies** and depends on the conversation.
- **Standard message and data rates may apply.**
- **To stop** receiving texts, reply **STOP**. You will receive a confirmation and no further messages from that number. Reply **START** to resume.
- **For help**, reply **HELP** or contact us at spreadrun@gmail.com.
- Carriers are not liable for delayed or undelivered messages.

**Texts sent to our customers.** If you give us your mobile number, you agree to receive account, billing, and service texts from SecondRing, with the same frequency, rate, STOP, and HELP terms above.

**No sharing of mobile information.** We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes. Phone numbers, text message content, and opt-in information are shared only with the service providers that help us deliver messages and run SecondRing, as described below, and with the business the person contacted.

#### Who we share information with

We share information only as needed to run the Service:
- **The business** a caller contacted, which owns and can see its own conversations.
- **Service providers** that process data for us: Twilio (phone numbers and text delivery), Stripe (payments and billing), Supabase (database and sign-in), Resend (email), Vercel (hosting), and Google Analytics (site analytics). They may use the data only to provide their services to us.
- **Authorities and others** when required by law or to protect rights, safety, or the security of the Service, or in connection with a business transfer such as a merger or sale.

#### Retention

We keep account and conversation data while your account is active. We may delete your data after your trial or subscription ends. You can ask us to delete your data sooner. We may keep limited records longer where needed for billing, tax, security, carrier compliance, or legal reasons.

#### Security

We use reasonable technical and organizational measures to protect your information, including encryption in transit and access controls on our database. No system is perfectly secure, and we cannot guarantee absolute security.

#### Your choices and rights

You can access, correct, export, or delete your information by contacting us. Callers and texters can opt out of texts by replying STOP, and can ask us or the business they contacted to delete their conversation. Depending on where you live, you may have additional rights under local privacy laws; we will honor valid requests as required.

#### Cookies and analytics

We use cookies and similar technologies for sign-in and to measure site usage with Google Analytics. You can block or delete cookies in your browser settings, though some features may not work.

#### Children

The Service is for businesses and is not directed to children under 13. We do not knowingly collect information from children.

#### Changes to this policy

We may update this policy. If a change is material we will notify customers by email or in the Service. The date at the top shows when it was last updated.

#### Contact us

SecondRing. Questions or requests: spreadrun@gmail.com or our [contact page](/contact).

## Changes to this policy

We may update this policy. If a change is material we will notify account holders by email or on the site. The date at the top shows when it was last updated.

## Contact us

Questions or requests: spreadrun@gmail.com or our [contact page](/contact).
