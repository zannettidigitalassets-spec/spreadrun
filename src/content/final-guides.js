// SEO guide batch 4 (CMMC and the remainder): five pages for the CMMC, COBRA and PECOS validators and the CPSC eFiling
// checklist. Metadata only, so scripts/tests/final-guides.test.mjs can check it without JSX. Bodies are in
// src/pages/FinalGuides.jsx.

export const FINAL_GUIDE_PUBLISHED = '2026-10-05';

const ECFR32 = 'https://www.ecfr.gov/current/title-32/subtitle-A/chapter-I/subchapter-G/part-170/subpart-D/section-';
const ECFR42 = 'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-424/subpart-P/section-';

// Primary sources, read in full on October 5, 2026. Each page cites the ones it relies on, claim by claim.
export const SRC = {
  cfr170_24: ['32 CFR 170.24, CMMC scoring methodology', `${ECFR32}170.24`],
  cfr170_21: ['32 CFR 170.21, plan of action and milestones requirements', `${ECFR32}170.21`],
  cfr170_16: ['32 CFR 170.16, CMMC Level 2 self-assessment and affirmation requirements', `${ECFR32}170.16`],

  usc1132: ['29 U.S.C. 1132, ERISA civil enforcement (section 502)', 'https://www.law.cornell.edu/uscode/text/29/1132'],
  usc1166: ['29 U.S.C. 1166, COBRA notice requirements', 'https://www.law.cornell.edu/uscode/text/29/1166'],
  cfr2575: ['29 CFR 2575.502c-1, adjusted civil penalty under ERISA section 502(c)(1)', 'https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XXV/subchapter-G/part-2575/subpart-A/section-2575.502c-1'],
  usc4980b: ['26 U.S.C. 4980B, failure to satisfy continuation coverage requirements', 'https://www.law.cornell.edu/uscode/text/26/4980B'],
  morehouse: ['Morehouse v. Steak N Shake, Inc., No. 18-4186 (6th Cir. September 13, 2019)', 'https://law.justia.com/cases/federal/appellate-courts/ca6/18-4186/18-4186-2019-09-13.html'],
  randolph: ['Randolph v. East Baton Rouge Parish School System, No. 21-30022 (5th Cir. November 30, 2021)', 'https://www.ca5.uscourts.gov/Opinions/pub/21/21-30022-CV0.pdf'],
  howard: ['Howard v. Ivy Creek of Tallapoosa, No. 3:20-cv-213 (M.D. Ala.), memorandum opinion', 'https://law.justia.com/cases/federal/district-courts/alabama/almdce/3:2020cv00213/72466/76/'],

  cmsReval: ['CMS: Revalidations (Renewing Your Enrollment)', 'https://www.cms.gov/medicare/enrollment-renewal/providers-suppliers/revalidations'],
  revalList: ['CMS: Medicare Revalidation List', 'https://data.cms.gov/revalidation'],
  cfr424_515: ['42 CFR 424.515, reporting changes and periodic revalidation', `${ECFR42}424.515`],
  cfr424_540: ['42 CFR 424.540, deactivation of Medicare billing privileges', `${ECFR42}424.540`],
  cfr424_541: ['42 CFR 424.541, stay of enrollment', `${ECFR42}424.541`],
  cfr424_546: ['42 CFR 424.546, deactivation rebuttals', `${ECFR42}424.546`],
  cfr424_535: ['42 CFR 424.535, revocation of enrollment', `${ECFR42}424.535`],
  cfr424_525: ['42 CFR 424.525, rejection of an enrollment application', `${ECFR42}424.525`],
  mln: ['CMS MLN9658742, Medicare Provider Enrollment (December 2025)', 'https://www.cms.gov/Outreach-and-Education/Medicare-Learning-Network-MLN/MLNProducts/EnrollmentResources/provider-resources/provider-enrolment/Med-Prov-Enroll-MLN9658742.html'],

  cfr1110: ['16 CFR part 1110, certificates of compliance', 'https://www.ecfr.gov/current/title-16/chapter-II/subchapter-B/part-1110'],
  frRule: ['CPSC final rule, Certificates of Compliance, 90 FR 1800 (January 8, 2025)', 'https://www.federalregister.gov/documents/2025/01/08/2024-30826/certificates-of-compliance'],
  cpscIg: ['CBP and Trade Automated Interface Requirements: CPSC eFiling Implementation Guide, version 2.4', 'https://www.govinfo.gov/app/details/GOVPUB-HS4_100-PURL-gpo255990'],
  registryFaq: ['CPSC Product Registry Frequently Asked Questions, version 1.4', 'https://www.cpsc.gov/s3fs-public/Product_Registry_Frequently_Asked_Questions_V1-4.pdf'],
  usc2066: ['15 U.S.C. 2066, imported products', 'https://www.law.cornell.edu/uscode/text/15/2066'],
  cpscPenalties: ['CPSC, Civil Penalties; Notice of Adjusted Maximum Amounts (December 1, 2021)', 'https://www.federalregister.gov/documents/2021/12/01/2021-26082/civil-penalties-notice-of-adjusted-maximum-amounts'],
};

export const FINAL_GUIDES = [
  {
    slug: 'sprs-score-calculation',
    title: 'How Your SPRS Score Is Calculated: the 110-Point Math',
    crumb: 'SPRS score math',
    description: 'How a CMMC Level 2 SPRS score is worked out: start at 110, subtract 5, 3 or 1 per unmet requirement, partial credit for MFA and encryption, N/A, the -203 floor.',
    blurb: 'Start at 110 and subtract 5, 3 or 1 for each requirement not met. Partial credit, N/A, the SSP, the -203 floor and a worked example.',
    family: 'cmmc',
    sources: ['cfr170_24', 'cfr170_21', 'cfr170_16'],
    cta: ['/apis/cmmc-self-assessment-validator'],
  },
  {
    slug: 'cmmc-poam-rules',
    title: "CMMC POA&M Rules: What Can Wait 180 Days and What Can't",
    crumb: 'CMMC POA&M rules',
    description: 'The CMMC Level 2 POA&M rules: the 88 out of 110 threshold, which requirements can go on a POA&M, the six that never can, the 180-day closeout and what follows.',
    blurb: 'A score of at least 88, only 1-point items plus one exception, six requirements that can never wait, and 180 days to close out.',
    family: 'cmmc',
    sources: ['cfr170_21', 'cfr170_24', 'cfr170_16'],
    cta: ['/apis/cmmc-self-assessment-validator'],
  },
  {
    slug: 'cobra-penalty-110-per-day',
    title: 'COBRA Notice Penalties: Up to $110 a Day, Plus Medical Bills',
    crumb: 'COBRA notice penalties',
    description: 'What a missed COBRA notice can cost: up to $110 a day at a court\'s discretion, other relief like medical bills in some cases, and the separate IRS excise tax.',
    blurb: 'Up to $110 a day, at the court\'s discretion and never automatic. Medical bills as other relief in some cases, and the excise tax.',
    family: 'cobra',
    sources: ['usc1132', 'cfr2575', 'usc1166', 'usc4980b', 'morehouse', 'randolph', 'howard'],
    cta: ['/apis/cobra-notice-qa'],
  },
  {
    slug: 'medicare-revalidation-missed-deadline',
    title: 'Missed Your Medicare Revalidation Due Date? What Happens Next',
    crumb: 'Missed revalidation',
    description: 'Missed a Medicare revalidation due date? What CMS can do next: a stay, deactivation or revocation, the response windows, and reactivation without back pay.',
    blurb: 'A stay, deactivation or revocation, the clocks that apply, and why reactivation does not pay for the days you were deactivated.',
    family: 'pecos',
    sources: ['cmsReval', 'revalList', 'cfr424_515', 'cfr424_540', 'cfr424_541', 'cfr424_546', 'cfr424_535', 'cfr424_525', 'mln'],
    cta: ['/apis/pecos-enrollment-precheck'],
  },
  {
    slug: 'what-is-cpsc-efiling',
    title: 'CPSC eFiling Explained: Certificates, ACE, and the 2027 Deadline',
    crumb: 'CPSC eFiling explained',
    description: 'What CPSC eFiling is, the seven certificate data elements, Full vs Reference PGA Message Sets, the Product Registry, and the July 2026 and January 2027 dates.',
    blurb: 'Certificate data filed with the entry in ACE. The seven data elements, Full vs Reference filing, and the two compliance dates.',
    family: 'cpsc',
    sources: ['cfr1110', 'frRule', 'cpscIg', 'registryFaq', 'usc2066', 'cpscPenalties'],
    cta: ['/tools/cpsc-efiling-readiness-checklist'],
  },
];

export const finalGuideBySlug = (slug) => FINAL_GUIDES.find((g) => g.slug === slug);
