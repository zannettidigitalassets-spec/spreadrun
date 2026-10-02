import { SectionTitle, P, UL, SUPPORT_EMAIL } from '../LegalLayout.jsx';

// SecondRing's Terms as published on 2026-09-30, moved here unchanged on 2026-10-02.
// The SMS / Twilio language is carrier-registered: do not reword anything in this file.
export default function SecondRingTerms() {
  return (
    <>
      <P>These Terms of Service ("Terms") are an agreement between you and SecondRing ("we," "us," "our"). They govern your use of SecondRing, a service that automatically sends a text message to people who call your business and are not answered, and gives you an inbox to continue those conversations (the "Service"). By creating an account or using the Service you agree to these Terms. If you do not agree, do not use the Service.</P>

      <SectionTitle>Who can use SecondRing</SectionTitle>
      <P>SecondRing is for businesses. You must be at least 18, able to form a binding contract, and using the Service for a business you own or are authorized to act for. You are responsible for everything done under your account.</P>

      <SectionTitle>What the Service does</SectionTitle>
      <P>You connect a business phone number to SecondRing (for example, by forwarding missed calls to a number we provide). When a call to your business goes unanswered, SecondRing sends a text message to the caller from your business's SecondRing number, using wording you control. Replies from the caller appear in your SecondRing inbox, where you can answer them. You can also set after-hours messages and tag conversations.</P>
      <P>We work to deliver messages quickly and reliably, but delivery depends on phone carriers and other third parties we do not control. We do not guarantee that any call will trigger a text, that any text will be delivered, or that delivery will happen within any particular time.</P>

      <SectionTitle>SMS Terms</SectionTitle>
      <P>When SecondRing sends a text to someone who called your business, that text is sent on your behalf, to respond to the call they placed to you. You are the sender of those messages and are responsible for using the Service in compliance with applicable law, including the Telephone Consumer Protection Act (TCPA), CTIA messaging guidelines, carrier rules, and state laws on texting. You agree that you will:</P>
      <UL>
        <li>Use the Service only to respond to people who contacted your business, and only about their inquiry, such as scheduling, quoting, or following up on the job they called about.</li>
        <li>Not use the Service to send marketing or promotional messages, to message people who have not contacted you, or to send unlawful, deceptive, harassing, or prohibited content.</li>
        <li>Honor opt-outs. If a person replies STOP (or a similar opt-out word), SecondRing stops texting them from your number, and you must not try to message them another way through the Service.</li>
        <li>Set your business voicemail greeting to the script SecondRing recommends, which tells callers that they may get a follow-up text and can reply STOP to opt out. SecondRing requires this step during onboarding because the greeting is the caller's notice before we text them.</li>
        <li>Accurately identify your business in your messages and in any information you provide for carrier registration.</li>
        <li>Give us truthful registration information. Carriers and messaging providers require every business number to be registered, and they may reject, suspend, or block a registration or number. We are not responsible for carrier decisions.</li>
      </UL>
      <P>We may suspend or limit messaging, or your account, if we believe messages violate these Terms, the law, or carrier requirements, or if we receive complaints.</P>
      <P>For the texts SecondRing sends to you (such as account, billing, and service notices), you consent to receive them by providing your mobile number. Message frequency varies. Standard message and data rates may apply. Reply STOP to opt out or HELP for help at any time. See our <a href="/privacy" style={{ color: "#0B5FFF" }}>Privacy Policy</a> for how we handle SMS opt-in data.</P>

      <SectionTitle>Free trial</SectionTitle>
      <P>New accounts get a 14-day free trial. The trial does not require a credit card or any other payment method. When the trial ends, you will need to choose a paid plan to keep using the Service. If you do not, your account becomes read-only or locked and messaging stops. We may delete your data after your trial ends. Each business is limited to one free trial, and we may decline a trial if we suspect abuse.</P>

      <SectionTitle>Plans, billing and renewal</SectionTitle>
      <P>SecondRing is offered as a monthly subscription. Current plans and prices are shown on our pricing page and at checkout (currently Solo at $19 per month and Shop at $29 per month, in U.S. dollars). Each plan includes the phone numbers and monthly text volume described on the pricing page. Prices exclude any taxes we are required to collect.</P>
      <P>Payments are processed by Stripe. By subscribing you authorize us, through Stripe, to charge your payment method each month until you cancel. Subscriptions renew automatically on the same date each month. If a payment fails, we may retry it, notify you, and suspend the Service until the balance is paid.</P>
      <P>We may change prices or plan features. We will give you notice before a change affects your subscription, and you may cancel before the change takes effect.</P>

      <SectionTitle>Cancellation and refunds</SectionTitle>
      <P>You can cancel at any time from your Account page (which opens the Stripe billing portal) or by contacting us. Cancellation takes effect at the end of your current paid month; you keep access and messaging until then, and you will not be charged again. We do not provide refunds or credits for partial months, unused time, or unused messages, except where required by law or where we made a billing error. We may delete your data after your subscription ends.</P>

      <SectionTitle>Your data</SectionTitle>
      <P>You keep ownership of your business information and of the conversations in your inbox. You give us permission to process that data to operate the Service, as described in our <a href="/privacy" style={{ color: "#0B5FFF" }}>Privacy Policy</a>. You are responsible for having any rights and permissions needed for the information you put into the Service.</P>

      <SectionTitle>Acceptable use</SectionTitle>
      <P>You agree not to misuse the Service, including by sending spam or unlawful content, attempting to gain unauthorized access, interfering with the Service or its security, reselling it without our permission, or using it for any unlawful purpose.</P>

      <SectionTitle>Third-party services</SectionTitle>
      <P>The Service relies on third parties such as phone carriers, messaging providers, and payment processors. SecondRing is independent of and not endorsed by Google or any advertising platform. References to Google Local Services Ads are for context only, and we do not control how any platform bills or ranks you.</P>

      <SectionTitle>No guarantee of results</SectionTitle>
      <P>SecondRing is a tool. It does not guarantee that you will win any job, recover any lead, or reduce any advertising charge.</P>

      <SectionTitle>Intellectual property</SectionTitle>
      <P>The Service, including its software, design, and content (excluding your data), belongs to us and our licensors. We give you a limited, non-exclusive, non-transferable right to use it for your business while you are subscribed or on trial.</P>

      <SectionTitle>Disclaimers</SectionTitle>
      <P>The Service is provided "as is" and "as available," without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, and non-infringement, to the fullest extent permitted by law. We do not warrant that the Service will be uninterrupted, error-free, or that messages will always be delivered.</P>

      <SectionTitle>Limitation of liability</SectionTitle>
      <P>To the fullest extent permitted by law, we will not be liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits, lost jobs, or lost revenue, arising from your use of the Service. Our total liability for any claim relating to the Service is limited to the amount you paid us in the three months before the event giving rise to the claim. You agree to indemnify us against claims arising from messages you send through the Service in violation of these Terms or applicable law.</P>

      <SectionTitle>Termination</SectionTitle>
      <P>You may stop using the Service at any time. We may suspend or end your access if you breach these Terms, if required by law or a carrier, or if we discontinue the Service, in which case we will refund any prepaid, unused time.</P>

      <SectionTitle>Changes to these Terms</SectionTitle>
      <P>We may update these Terms. If a change is material, we will notify you by email or in the Service before it takes effect. Continuing to use the Service after a change means you accept the updated Terms.</P>

      <SectionTitle>Contact us</SectionTitle>
      <P>Questions about these Terms? Use our <a href="/contact" style={{ color: "#0B5FFF" }}>contact page</a> or email <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "#0B5FFF" }}>{SUPPORT_EMAIL}</a>.</P>
    </>
  );
}
