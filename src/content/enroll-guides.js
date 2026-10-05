// SEO guide batch 3 (PECOS and COBRA): five pages for the two $25 validators. Metadata only, so
// scripts/tests/enroll-guides.test.mjs can check it without JSX. Bodies are in src/pages/EnrollGuides.jsx.

export const ENROLL_GUIDE_PUBLISHED = '2026-10-05';

const ECFR42 = 'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-424/subpart-P/section-';
const ECFR29 = 'https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XXV/subchapter-L/part-2590/subpart-A/section-';

// Primary sources, read in full on October 5, 2026. Each page cites the ones it relies on, claim by claim.
export const SRC = {
  cfr424_525: ['42 CFR 424.525, rejection of an enrollment application', `${ECFR42}424.525`],
  cfr424_526: ['42 CFR 424.526, return of an enrollment application', `${ECFR42}424.526`],
  cfr424_530: ['42 CFR 424.530, denial of enrollment', `${ECFR42}424.530`],
  cfr424_540: ['42 CFR 424.540, deactivation of Medicare billing privileges', `${ECFR42}424.540`],
  cfr424_545: ['42 CFR 424.545, provider and supplier appeal rights', `${ECFR42}424.545`],
  mln: ['CMS MLN9658742, Medicare Provider Enrollment (December 2025)', 'https://www.cms.gov/Outreach-and-Education/Medicare-Learning-Network-MLN/MLNProducts/EnrollmentResources/provider-resources/provider-enrolment/Med-Prov-Enroll-MLN9658742.html'],
  cms855i: ['CMS-855I (05/23), Medicare enrollment application for physicians and non-physician practitioners', 'https://www.cms.gov/medicare/cms-forms/cms-forms/downloads/cms855i.pdf'],
  cfr162: ['45 CFR part 162, subpart D, the National Provider Identifier (162.406 to 162.410)', 'https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-162/subpart-D'],
  npiApi: ['NPPES NPI Registry: API help (version 2.1)', 'https://npiregistry.cms.hhs.gov/api-page'],
  npiSearch: ['NPPES NPI Registry: search', 'https://npiregistry.cms.hhs.gov/search'],
  cfr606_1: ['29 CFR 2590.606-1, general notice of continuation coverage', `${ECFR29}2590.606-1`],
  cfr606_2: ['29 CFR 2590.606-2, notice requirement for employers', `${ECFR29}2590.606-2`],
  cfr606_3: ['29 CFR 2590.606-3, notices from covered employees and qualified beneficiaries', `${ECFR29}2590.606-3`],
  cfr606_4: ['29 CFR 2590.606-4, notice requirements for plan administrators', `${ECFR29}2590.606-4`],
  cfr54_6: ['26 CFR 54.4980B-6, electing COBRA continuation coverage', 'https://www.ecfr.gov/current/title-26/chapter-I/subchapter-D/part-54/section-54.4980B-6'],
  cfr54_8: ['26 CFR 54.4980B-8, paying for COBRA continuation coverage', 'https://www.ecfr.gov/current/title-26/chapter-I/subchapter-D/part-54/section-54.4980B-8'],
};

export const ENROLL_GUIDES = [
  {
    slug: 'pecos-returned-for-corrections',
    title: 'PECOS Returned for Corrections: What It Means and How to Resubmit',
    crumb: 'Returned for corrections',
    description: 'What PECOS Returned for Corrections means, how it differs from a return, a rejection and a denial, the 30-day window, the signature rule, and how to resubmit.',
    blurb: 'Returned for corrections, returned, rejected and denied are four different outcomes. The 30-day window and how to get back on track.',
    family: 'pecos',
    sources: ['mln', 'cfr424_526', 'cfr424_525', 'cfr424_530', 'cfr424_545', 'cms855i'],
    cta: ['/apis/pecos-enrollment-precheck'],
  },
  {
    slug: 'npi-not-active-nppes',
    title: 'NPI Not Active in NPPES: Causes and Fixes Before PECOS',
    crumb: 'NPI not active',
    description: 'Why an NPI shows as not active in NPPES, how that differs from Medicare deactivation, how to check the NPI Registry, and the mismatches to fix before PECOS.',
    blurb: 'An NPI deactivated in NPPES is not the same as Medicare billing privileges deactivated. How to check, and what has to match.',
    family: 'pecos',
    sources: ['cfr162', 'npiApi', 'npiSearch', 'cms855i', 'cfr424_540'],
    cta: ['/apis/pecos-enrollment-precheck'],
  },
  {
    slug: '855i-rejection-reasons',
    title: 'Why 855I Applications Get Rejected: 7 Reasons and Fixes',
    crumb: '855I rejection reasons',
    description: 'Seven documented reasons a CMS-855I application can be rejected, from name mismatches to signature problems, each with its fix and the rule it comes from.',
    blurb: 'Seven reasons from the rejection rule and the form itself, unranked, each with the fix. And the 30 days you have before rejection.',
    family: 'pecos',
    sources: ['cfr424_525', 'cms855i', 'cfr424_526', 'mln'],
    cta: ['/apis/pecos-enrollment-precheck'],
  },
  {
    slug: 'cobra-election-notice-requirements',
    title: 'COBRA Election Notice Requirements: the 14-Item Checklist',
    crumb: 'Election notice checklist',
    description: 'The 14 items every COBRA election notice must contain under 29 CFR 2590.606-4(b)(4), in plain English, plus the 6 general notice items under 2590.606-1(c).',
    blurb: 'All 14 required items of the election notice, each explained, plus the 6 items of the general notice.',
    family: 'cobra',
    sources: ['cfr606_4', 'cfr606_1'],
    cta: ['/apis/cobra-notice-qa'],
  },
  {
    slug: 'cobra-notice-deadlines',
    title: 'COBRA Notice Deadlines: the 44-Day, 30+14, 90-Day and 60-Day Rules',
    crumb: 'COBRA deadlines',
    description: 'Every COBRA notice and payment deadline: 44 days, 30 plus 14, 14 days after a divorce notice, 90 days, the 60-day election, 45-day first payment, 30-day grace.',
    blurb: 'The full deadline map, from the qualifying event to the first premium, with the regulation behind each date and a worked timeline.',
    family: 'cobra',
    sources: ['cfr606_2', 'cfr606_4', 'cfr606_3', 'cfr606_1', 'cfr54_6', 'cfr54_8'],
    cta: ['/apis/cobra-notice-qa'],
  },
];

export const enrollGuideBySlug = (slug) => ENROLL_GUIDES.find((g) => g.slug === slug);
