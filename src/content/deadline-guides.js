// SEO guide batch 1 (deadline fire): five pages for the UAD 3.6 mandate (November 2, 2026) and the PBJ fiscal
// quarter 4 deadline (November 14, 2026). Metadata only, so scripts/tests/deadline-guides.test.mjs can check it
// without JSX. The page bodies are in src/pages/DeadlineGuides.jsx.

export const DEADLINE_GUIDE_PUBLISHED = '2026-10-05';

// Primary sources, checked October 5, 2026. Each page cites the ones it relies on, claim by claim.
export const SRC = {
  fiveStar: ['CMS Five-Star Quality Rating System Technical Users\' Guide (September 2026)', 'https://www.cms.gov/files/document/five-star-users-guide-september-2026.pdf'],
  pbjSubmission: ['CMS: Staffing Data Submission (PBJ), page updated September 11, 2026', 'https://www.cms.gov/medicare/quality/nursing-home-improvement/staffing-data-submission'],
  pbjErrorGuide: ['CMS iQIES PBJ Error Message Reference Guide v1.0 (July 2026)', 'https://qtso.cms.gov/system/files/qtso/PBJ%20Error%20Message%20Reference%20Guide%20FINAL%20v1.0%2007.20.26_0.pdf'],
  pbjIqiesNotice: ['QTSO: What to Expect: PBJ Data Submission and Reporting in iQIES (June 30, 2026)', 'https://qtso.cms.gov/news-and-updates/what-expect-pbj-data-submission-and-reporting-iqies'],
  pbjErrorList: ['QTSO: iQIES PBJ manuals and error messages list (July 2026)', 'https://qtso.cms.gov/reference-and-manuals/iqies-payroll-based-journal-pbj-manuals'],
  h1: ['Fannie Mae and Freddie Mac: Appendix H-1, URAR Compliance Rules v1.5 (on the Uniform Appraisal Dataset page)', 'https://singlefamily.fanniemae.com/delivering/uniform-mortgage-data-program/uniform-appraisal-dataset'],
  ucdpGuide: ['UCDP General User Guide (February 2026)', 'https://sf.freddiemac.com/docs/pdf/step-by-step-guides/ucdp-general-user-guide.pdf'],
  ssrGuide: ['Submission Summary Report (SSR) Guide for UAD 3.6 (August 2025)', 'https://sf.freddiemac.com/docs/pdf/ssr-guide-uad-3.6.pdf'],
  ucdpFaq: ['Freddie Mac UCDP FAQ (updated September 30, 2026)', 'https://sf.freddiemac.com/faqs/ucdp-faq'],
  lessons: ['UAD 3.6 Job Aid: Guidance for Appraisers through Lessons Learned (June 23, 2026)', 'https://singlefamily.fanniemae.com/media/document/pdf/uad-36-lessons-learned'],
  complianceApi: ['Fannie Mae: UAD Compliance API product factsheet', 'https://singlefamily.fanniemae.com/media/document/pdf/compliance-api-product-factsheet'],
};

export const DEADLINE_GUIDES = [
  {
    slug: 'pbj-zero-rn-days',
    title: 'PBJ Zero-RN Days: the 4-Day Rule That Kills Your Staffing Star',
    crumb: 'Zero-RN days',
    description: 'How CMS counts a PBJ zero-RN day, why four in a quarter means a one-star staffing rating, what that does to the overall star, and how to scan your data first.',
    blurb: 'Four days in a quarter with no RN hours while residents are in the building, and the staffing rating drops to one star. How CMS counts them.',
    family: 'pbj',
    sources: ['fiveStar', 'pbjSubmission'],
    cta: ['/tools/pbj-preflight-checks', '/apis/pbj-staffing-qa'],
  },
  {
    slug: 'uad36-rule-uad1189',
    title: 'UAD1189, UAD1190, UAD1484: Below-Grade Area Rules Explained',
    crumb: 'UAD1189, UAD1190, UAD1484',
    description: 'What UAD 3.6 rules UAD1189, UAD1190 and UAD1484 require for below grade area, why a blank is a fatal finding when 0 is not, and where they sit on the URAR.',
    blurb: 'Finished, unfinished and nonstandard finished below grade area: three Fatal rules, and a 0 passes where a blank fails.',
    family: 'uad',
    sources: ['h1', 'lessons', 'ucdpGuide'],
    cta: ['/apis/uad-36-appraisal-validator'],
  },
  {
    slug: 'uad36-rule-uad1001',
    title: 'UAD1001-UAD1007: Subject Property Address Rules',
    crumb: 'UAD1001 to UAD1007',
    description: 'UAD 3.6 address rules UAD1001 to UAD1007 one by one: the exact message, what is missing or malformed, and the fix for each, from the published compliance rules.',
    blurb: 'Seven Fatal rules on the subject address. Five say a part is missing, two say it is in the wrong format. The fix for each.',
    family: 'uad',
    sources: ['h1', 'ucdpGuide'],
    cta: ['/apis/uad-36-appraisal-validator'],
  },
  {
    slug: 'pbj-file-rejected',
    title: 'PBJ File Rejected: Reading the Final File Validation Report',
    crumb: 'PBJ file rejected',
    description: 'Where to find the PBJ Final Validation Report in iQIES, what fatal and warning errors mean for your records, and how to fix and resubmit before November 14.',
    blurb: 'Fatal errors reject the record, warnings do not. Where the report is now that PBJ runs in iQIES, and how to work through it.',
    family: 'pbj',
    sources: ['pbjErrorGuide', 'pbjIqiesNotice', 'pbjSubmission', 'pbjErrorList'],
    cta: ['/apis/pbj-staffing-qa'],
  },
  {
    slug: 'how-to-fix-ucdp-errors',
    title: 'How to Fix UCDP Errors Before Resubmission',
    crumb: 'Fix UCDP errors',
    description: 'How to read a UAD 3.6 Submission Summary Report by severity, what to fix first, the issues the GSEs flag most in their lessons learned, and when to check again.',
    blurb: 'Read the SSR by severity, fix Fatal first, check the file again, then resubmit. The UCDP rules behind each step.',
    family: 'uad',
    sources: ['ssrGuide', 'ucdpGuide', 'ucdpFaq', 'lessons', 'complianceApi', 'h1'],
    cta: ['/apis/uad-36-appraisal-validator'],
  },
];

export const deadlineGuideBySlug = (slug) => DEADLINE_GUIDES.find((g) => g.slug === slug);
