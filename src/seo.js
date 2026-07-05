// Sets the page title and meta description dynamically for each route.
// Since SpreadRun is a client-side React SPA, meta tags are updated via JS
// as each page component mounts. This is the standard approach for SPAs
// without server-side rendering.

export function setPageMeta(title, description, canonicalPath = null) {
  // Update the document title
  document.title = title;

  // Update or create the meta description tag
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    document.head.appendChild(metaDesc);
  }
  metaDesc.setAttribute('content', description);

  // Update or create the OG title tag (used by social sharing)
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (!ogTitle) {
    ogTitle = document.createElement('meta');
    ogTitle.setAttribute('property', 'og:title');
    document.head.appendChild(ogTitle);
  }
  ogTitle.setAttribute('content', title);

  // Update or create the OG description tag
  let ogDesc = document.querySelector('meta[property="og:description"]');
  if (!ogDesc) {
    ogDesc = document.createElement('meta');
    ogDesc.setAttribute('property', 'og:description');
    document.head.appendChild(ogDesc);
  }
  ogDesc.setAttribute('content', description);

  // Update or create the canonical link tag — tells Google which URL is the
  // "real" one for this content, preventing duplicate content issues from
  // query strings, trailing slashes, or the www/non-www split.
  const canonicalUrl = `https://www.spreadrun.com${canonicalPath !== null ? canonicalPath : window.location.pathname}`;
  let canonicalLink = document.querySelector('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', canonicalUrl);

  // Update or create the OG url tag to match the canonical URL
  let ogUrl = document.querySelector('meta[property="og:url"]');
  if (!ogUrl) {
    ogUrl = document.createElement('meta');
    ogUrl.setAttribute('property', 'og:url');
    document.head.appendChild(ogUrl);
  }
  ogUrl.setAttribute('content', canonicalUrl);

  // Remove any previously injected FAQ schema since guide pages
  // now handle schema inline in JSX for better crawler compatibility
  const existingSchema = document.getElementById('sr-faq-schema');
  if (existingSchema) existingSchema.remove();
}

// Per-page SEO config — title and description optimized for each route's
// primary keyword intent. Titles follow the format: Primary Keyword | SpreadRun
export const PAGE_META = {
  home: {
    title: "Free Real Estate Deal Analyzer | SpreadRun",
    description: "Analyze any rental property, fix & flip, or DSCR loan in seconds. Free cash flow calculator, cap rate, and deal signals — no spreadsheet required.",
  },
  app: {
    title: "Real Estate Deal Analyzer — Rental, Flip & DSCR Calculator | SpreadRun",
    description: "Run the numbers on any real estate deal instantly. Free rental property calculator, fix and flip analyzer, and DSCR qualifier in one tool.",
  },
  myDeals: {
    title: "My Saved Deals | SpreadRun",
    description: "View, compare, and export your saved real estate deals. Side-by-side deal comparison and PDF reports for Starter members.",
  },
  contact: {
    title: "Contact SpreadRun | Real Estate Calculator Support",
    description: "Have a question or found an issue? Get in touch with the SpreadRun team. We respond personally to every message.",
  },
  guides: {
    title: "Real Estate Investing Guides & Calculators | SpreadRun",
    description: "Free guides on DSCR loans, cash flow analysis, the 70% rule, cap rates, and how to analyze rental properties like a pro investor.",
  },
  dscrGuide: {
    title: "DSCR Loan Calculator: What Is DSCR & How to Qualify | SpreadRun",
    description: "Learn what Debt Service Coverage Ratio means, how lenders use it, and use our free DSCR calculator to see if your rental property qualifies for investor financing.",
    faq: [
      { q: "What is DSCR in real estate?", a: "DSCR stands for Debt Service Coverage Ratio. It measures how much income a property produces relative to its debt obligations. A DSCR above 1.0 means the rent covers the mortgage payment; above 1.25 is what most lenders require for investor financing." },
      { q: "What DSCR do I need to qualify for a loan?", a: "Most lenders require a minimum DSCR of 1.25, meaning the property's gross rent must be at least 125% of the monthly PITI payment (principal, interest, taxes, and insurance). Some lenders will approve at 1.0, but with higher rates and larger down payments." },
      { q: "How do I calculate DSCR?", a: "Divide the property's monthly gross rent by the total monthly PITI payment. For example, if rent is $2,000 and PITI is $1,600, the DSCR is 1.25 — which meets most lenders' minimum requirement." },
      { q: "What happens if my DSCR is below 1.25?", a: "If your DSCR is below 1.25, you can improve it by increasing the rent (choosing a higher-rent property), reducing the loan amount with a larger down payment, finding a lower interest rate, or negotiating a lower purchase price." },
      { q: "Do DSCR loans require income verification?", a: "No. DSCR loans qualify based on the property's rental income, not your personal W-2 income or tax returns. This makes them popular with self-employed investors and those with multiple properties." },
    ],
  },
  cashFlowGuide: {
    title: "Rental Property Cash Flow Calculator: How to Analyze Any Deal | SpreadRun",
    description: "Step-by-step guide to calculating rental property cash flow. Use our free calculator to find cash-on-cash return, cap rate, and monthly net income.",
    faq: [
      { q: "What is cash flow in rental real estate?", a: "Cash flow is the money left over each month after collecting rent and paying all expenses including the mortgage, taxes, insurance, maintenance, and property management fees. Positive cash flow means the property makes money; negative means it costs you money each month." },
      { q: "What is a good cash flow for a rental property?", a: "Most investors target at least $100–$200 per door per month in net cash flow as a minimum threshold. Strong deals often produce $300–$500/month. What constitutes 'good' depends on your market, purchase price, and overall investment goals." },
      { q: "What is cash-on-cash return?", a: "Cash-on-cash return measures your annual cash flow as a percentage of the total cash you invested (down payment plus closing costs). A 8–12% cash-on-cash return is generally considered strong for a rental property." },
      { q: "What expenses should I include in a rental property analysis?", a: "Include mortgage (P&I), property taxes, insurance, maintenance (typically 5–10% of rent), property management (8–10% of rent if using a manager), vacancy allowance (5–10%), and any other recurring costs like HOA or utilities you cover." },
      { q: "What is cap rate and how is it different from cash-on-cash?", a: "Cap rate measures a property's income relative to its purchase price, ignoring financing. Cash-on-cash measures your actual return on the cash you put in, including the effect of your mortgage. Both metrics matter — cap rate for comparing markets, cash-on-cash for evaluating your actual return." },
    ],
  },
  seventyPercentGuide: {
    title: "The 70% Rule for House Flipping: Calculator & Examples | SpreadRun",
    description: "Learn how the 70% rule works for fix and flip investing. Use our free calculator to find your maximum allowable offer and estimated profit on any flip.",
    faq: [
      { q: "What is the 70% rule in real estate?", a: "The 70% rule states that a fix and flip investor should pay no more than 70% of a property's after-repair value (ARV) minus the estimated rehab costs. It's a quick filter to ensure there's enough margin for profit after all costs." },
      { q: "How do I calculate the 70% rule?", a: "Multiply the ARV by 0.70, then subtract your estimated rehab costs. The result is your Maximum Allowable Offer (MAO). For example: $300,000 ARV × 0.70 = $210,000 − $40,000 rehab = $170,000 MAO." },
      { q: "Is the 70% rule always accurate?", a: "The 70% rule is a starting point, not a guarantee. It doesn't account for holding costs, agent commissions, or closing costs in detail. Always run a full deal analysis with actual cost estimates before making an offer." },
      { q: "What is ARV in real estate?", a: "ARV stands for After Repair Value — the estimated market value of a property after all planned renovations are complete. It's the foundation of the 70% rule and fix and flip analysis generally." },
      { q: "What is a good ROI for a house flip?", a: "Most experienced flippers target a minimum 20% ROI on total project cost, with net profits of $30,000 or more per deal. Lower margins leave too little buffer for cost overruns or delays." },
    ],
  },
  capRateGuide: {
    title: "What Is a Good Cap Rate for a Rental Property? | SpreadRun",
    description: "Understand cap rate, how to calculate it, and what a good cap rate looks like in today's market. Use our free rental analyzer to run the numbers instantly.",
    faq: [
      { q: "What is cap rate in real estate?", a: "Cap rate (capitalization rate) is the ratio of a property's annual net operating income (NOI) to its purchase price or market value. It's used to compare investment properties independent of financing. A higher cap rate generally means more income relative to price." },
      { q: "What is a good cap rate for a rental property?", a: "A good cap rate depends on your market. In expensive coastal markets, 4–5% may be considered solid. In Midwest or Sun Belt markets, investors typically target 6–10% or higher. Generally, above 6% is considered healthy for a single-family or small multifamily rental." },
      { q: "How do I calculate cap rate?", a: "Divide the property's annual net operating income (NOI) by its purchase price. NOI is gross rent minus all operating expenses excluding the mortgage. For example: $18,000 annual NOI ÷ $300,000 purchase price = 6% cap rate." },
      { q: "What is the difference between cap rate and cash-on-cash return?", a: "Cap rate ignores financing and measures the property's income as a percentage of its value. Cash-on-cash return accounts for your mortgage and measures your actual return on the cash invested. Cap rate is better for comparing markets; cash-on-cash is better for evaluating your specific deal." },
      { q: "Can cap rate change over time?", a: "Yes. Cap rate changes if the property's income changes (rent increases or vacancies) or if the market value changes. As property values rise, cap rates compress — meaning the same income produces a lower cap rate at a higher price." },
    ],
  },
  howToAnalyzeGuide: {
    title: "How to Analyze a Rental Property: Complete Investor Guide | SpreadRun",
    description: "A complete guide to analyzing rental properties — cash flow, cap rate, DSCR, and deal signals. Includes our free rental property calculator.",
    faq: [
      { q: "How do you analyze a rental property investment?", a: "Start with the purchase price and financing terms to calculate your mortgage payment. Then estimate gross rent, subtract a vacancy allowance, and deduct all operating expenses (taxes, insurance, maintenance, management). What remains is your net cash flow. Also calculate cap rate, cash-on-cash return, and DSCR to get a complete picture." },
      { q: "What numbers matter most when evaluating a rental property?", a: "The four most important metrics are: monthly cash flow (does the property make money?), cash-on-cash return (what's your return on invested capital?), cap rate (how does it compare to other properties?), and DSCR (will a lender finance it?)." },
      { q: "What is a good cash-on-cash return for a rental property?", a: "Most investors target 8–12% or higher. Below 6% is generally considered thin unless you're banking heavily on appreciation. The right threshold depends on your local market and investment goals." },
      { q: "How do I know if a rental property is a good deal?", a: "A good rental deal typically has positive monthly cash flow, a DSCR above 1.25, a cap rate at or above local market averages, and a cash-on-cash return above 8%. SpreadRun's Deal Signal feature automatically flags whether your inputs meet these benchmarks." },
      { q: "What vacancy rate should I use when analyzing a rental property?", a: "Most investors use a 5–10% vacancy rate as a conservative estimate. In strong rental markets, 5% is reasonable. In softer markets or if you're new to landlording, 8–10% provides a more conservative buffer." },
    ],
  },
  dscrCalculator: {
    title: "Free DSCR Calculator | Debt Service Coverage Ratio Tool",
    description: "Calculate your DSCR ratio instantly. See if your rental property qualifies for investor financing and exactly how much rent you need to hit the 1.25 benchmark.",
  },
  flipCalculator: {
    title: "Free Fix and Flip Calculator | 70% Rule & Profit Estimator",
    description: "Calculate your fix and flip profit, ROI, and maximum allowable offer instantly. Includes the 70% rule check, holding costs, agent fees, and closing costs.",
  },
  rentalCalculator: {
    title: "Free Rental Property Calculator | Cash Flow, Cap Rate & DSCR",
    description: "Calculate rental property cash flow, cap rate, cash-on-cash return, and DSCR instantly. Free rental property analyzer — no account required.",
  },
};
