// Sets the page title and meta description dynamically for each route.
// Since SpreadRun is a client-side React SPA, meta tags are updated via JS
// as each page component mounts. This is the standard approach for SPAs
// without server-side rendering.

export function setPageMeta(title, description) {
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
  },
  cashFlowGuide: {
    title: "Rental Property Cash Flow Calculator: How to Analyze Any Deal | SpreadRun",
    description: "Step-by-step guide to calculating rental property cash flow. Use our free calculator to find cash-on-cash return, cap rate, and monthly net income.",
  },
  seventyPercentGuide: {
    title: "The 70% Rule for House Flipping: Calculator & Examples | SpreadRun",
    description: "Learn how the 70% rule works for fix and flip investing. Use our free calculator to find your maximum allowable offer and estimated profit on any flip.",
  },
  capRateGuide: {
    title: "What Is a Good Cap Rate for a Rental Property? | SpreadRun",
    description: "Understand cap rate, how to calculate it, and what a good cap rate looks like in today's market. Use our free rental analyzer to run the numbers instantly.",
  },
  howToAnalyzeGuide: {
    title: "How to Analyze a Rental Property: Complete Investor Guide | SpreadRun",
    description: "A complete guide to analyzing rental properties — cash flow, cap rate, DSCR, and deal signals. Includes our free rental property calculator.",
  },
};
