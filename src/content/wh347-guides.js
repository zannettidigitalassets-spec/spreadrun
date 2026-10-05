// SEO guide batch 2 (WH-347 evergreen): five pages on certified payrolls, apprentices, fringe annualization and
// overtime. Metadata only, so scripts/tests/wh347-guides.test.mjs can check it without JSX. Bodies are in
// src/pages/Wh347Guides.jsx.

export const WH347_GUIDE_PUBLISHED = '2026-10-05';

// Primary sources, checked October 5, 2026. Each page cites the ones it relies on, claim by claim.
export const SRC = {
  form: ['DOL Wage and Hour Division: Form WH-347 (Rev. January 2025) and its instructions', 'https://www.dol.gov/agencies/whd/forms/wh347'],
  cfr55: ['29 CFR 5.5, contract provisions (certified payrolls, apprentices, overtime)', 'https://www.ecfr.gov/current/title-29/subtitle-A/part-5/subpart-A/section-5.5'],
  cfr525: ['29 CFR 5.25, rate of contribution or cost for fringe benefits (annualization)', 'https://www.ecfr.gov/current/title-29/subtitle-A/part-5/subpart-B/section-5.25'],
  cfr532: ['29 CFR 5.32, overtime payments', 'https://www.ecfr.gov/current/title-29/subtitle-A/part-5/subpart-B/section-5.32'],
  pwrbOvertime: ['DOL Prevailing Wage Resource Book: Overtime Pay on Government Contracts', 'https://www.dol.gov/agencies/whd/government-contracts/prevailing-wage-resource-book/overtime-pay-on-gov-contracts'],
  cfr778: ['29 CFR 778.115, regular rate when two or more rates are paid', 'https://www.law.cornell.edu/cfr/text/29/778.115'],
  usc3702: ['40 U.S.C. 3702, Contract Work Hours and Safety Standards Act overtime', 'https://www.law.cornell.edu/uscode/text/40/3702'],
  usc1001: ['18 U.S.C. 1001, false statements', 'https://www.law.cornell.edu/uscode/text/18/1001'],
  omb: ['OMB Notice of Action for control number 1235-0008 (January 6, 2025)', 'https://www.reginfo.gov/public/do/DownloadNOA?requestID=986060'],
  frNotice: ['Federal Register: WH-347 information collection notice (November 27, 2024)', 'https://www.federalregister.gov/documents/2024/11/27/2024-27720'],
  dbraFaq: ['DOL: Davis-Bacon final rule frequently asked questions', 'https://www.dol.gov/agencies/whd/government-contracts/construction/rulemaking-davis-bacon/faqs'],
};

export const WH347_GUIDES = [
  {
    slug: 'wh347-apprentice-reporting',
    title: 'How to Report Apprentices on the WH-347 (Column by Column)',
    crumb: 'Apprentices on the WH-347',
    description: 'How to report apprentices on the WH-347: the J and RA codes in column 2, the classification in column 3, the ratio rule and its penalty, and box 4 on page 2.',
    blurb: 'RA and the level in column 2, the classification in column 3, the ratio rule, and the box 4 apprenticeship statement on page 2.',
    sources: ['form', 'cfr55', 'dbraFaq'],
    cta: ['/tools/davis-bacon-apprentice-checker', '/apis/wh347-payroll-precheck'],
  },
  {
    slug: 'wh347-statement-of-compliance',
    title: 'WH-347 Statement of Compliance: Who Can Sign and What It Certifies',
    crumb: 'Statement of Compliance',
    description: 'Who can sign the WH-347 Statement of Compliance, the three things the signature certifies under 29 CFR 5.5, and the criminal and civil exposure for a false one.',
    blurb: 'The contractor or the agent who pays or supervises payment signs. Three certifications, and up to five years for a false statement.',
    sources: ['cfr55', 'form', 'usc1001'],
    cta: ['/apis/wh347-payroll-precheck'],
  },
  {
    slug: 'wh347-common-mistakes',
    title: '7 WH-347 Mistakes That Get Certified Payrolls Rejected',
    crumb: 'Common WH-347 mistakes',
    description: 'Seven WH-347 mistakes to catch before a certified payroll goes in: old form, overtime base, fringe entries, signature, timing, worker IDs, apprentice ratios.',
    blurb: 'Old form version, overtime on the wrong base, fringe entries, the signature, weekly timing, worker IDs and apprentice ratios.',
    sources: ['form', 'omb', 'frNotice', 'cfr55', 'cfr532', 'usc3702'],
    cta: ['/apis/wh347-payroll-precheck'],
  },
  {
    slug: 'davis-bacon-fringe-annualization',
    title: 'Davis-Bacon Fringe Annualization: the Formula With Examples',
    crumb: 'Fringe annualization',
    description: 'The Davis-Bacon fringe annualization formula: total cost divided by all hours worked, private work included, a worked example, the per-worker rule, exceptions.',
    blurb: 'Divide the cost by every hour worked, not just Davis-Bacon hours. A worked example, the per-worker rule, and the narrow exceptions.',
    sources: ['cfr525', 'form'],
    cta: ['/tools/davis-bacon-fringe-calculator'],
  },
  {
    slug: 'davis-bacon-weighted-overtime',
    title: 'Davis-Bacon Weighted-Average Overtime, Worked Example',
    crumb: 'Weighted-average overtime',
    description: 'Davis-Bacon overtime when a worker has two classifications in one week: the weighted average rate, a worked example, the agreed-in-advance option, and fringe.',
    blurb: 'Two classifications in one week: blend the rates, pay half the blended rate on top for overtime hours, and keep fringe out of it.',
    sources: ['pwrbOvertime', 'cfr778', 'cfr532', 'usc3702'],
    cta: ['/tools/davis-bacon-overtime-calculator'],
  },
];

export const wh347GuideBySlug = (slug) => WH347_GUIDES.find((g) => g.slug === slug);
