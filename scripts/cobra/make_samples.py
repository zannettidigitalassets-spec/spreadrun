"""Writes the COBRA sample requests to public/samples and pylib/tests/fixtures.

The plan, administrator, address and telephone number are invented (555-01xx is a fictional exchange). Beneficiaries
are named by status, never by name, so the samples hold no personal data. Run from the repo root.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

ELECTION = """IMPORTANT INFORMATION: COBRA CONTINUATION COVERAGE AND OTHER HEALTH COVERAGE ALTERNATIVES

Example Manufacturing Group Health Plan

Notice date: October 9, 2026

You are getting this notice because you recently gained the right to continue your health coverage under the Example Manufacturing Group Health Plan (the Plan) through COBRA continuation coverage. This notice explains your options and how to elect. Please read it carefully.

Plan contact: Example Benefits Administration, COBRA Administrator, 100 Example Way, Suite 200, Anytown, ST 00000. Telephone: (555) 010-0100.

Why am I getting this notice?
Your coverage under the Plan will end on September 30, 2026 because of the end of your employment. This is a qualifying event under COBRA. Federal law requires most group health plans to give employees and their families the chance to continue their health care coverage after a qualifying event.

Who may elect?
The following qualified beneficiaries may elect COBRA continuation coverage: you (the covered employee), your spouse, and your dependent children who were covered under the Plan on the day before the qualifying event. Each qualified beneficiary has an independent right to elect continuation coverage. You or your spouse may elect on behalf of all other qualified beneficiaries, and a parent or legal guardian may elect on behalf of a minor child.

What coverage is offered?
COBRA continuation coverage is the same coverage you had under the Plan on the day before the qualifying event. If you elect, coverage begins on October 1, 2026, the day after your Plan coverage ends, so there is no gap. More detail on the coverage is in the Plan's summary plan description (SPD).

How do I elect, and by when?
To elect, complete the enclosed election form and mail it to the COBRA Administrator at the address above. You have 60 days to elect. Your election must be postmarked no later than December 8, 2026. If you do not elect by that date, you lose your right to elect.

What if I do not elect or I waive coverage?
If you do not elect COBRA continuation coverage, or you waive it, your coverage under the Plan will end on September 30, 2026. Not electing may affect your rights to special enrollment in another group health plan and to coverage through the Health Insurance Marketplace. If you waive coverage now, you may revoke the waiver at any time before the election deadline by sending a written revocation to the COBRA Administrator. Coverage then begins on the date the revocation is received.

How long does coverage last?
Because the qualifying event is the end of employment, COBRA continuation coverage lasts up to 18 months, through March 31, 2028. Coverage may end early if a premium is not paid on time, if the employer stops offering any group health plan, if a qualified beneficiary becomes covered under another group health plan after electing, or if a qualified beneficiary becomes entitled to Medicare after electing.

Can coverage be extended?
If the Social Security Administration determines that a qualified beneficiary is disabled, every qualified beneficiary in the family may receive up to an additional 11 months, for a total of 29 months. A second qualifying event, such as the death of the employee, divorce, or a child losing dependent status, can extend coverage for a spouse and dependent children up to 36 months in total.

Your duty to notify the Plan
To get the disability extension, you must notify the COBRA Administrator in writing within 60 days of the Social Security disability determination and before the end of the first 18 months of coverage. To get the second qualifying event extension, you must notify the COBRA Administrator in writing within 60 days of the second qualifying event. If you do not give these notices on time, you lose the extension. You must also notify the Plan within 30 days if the Social Security Administration later determines that the qualified beneficiary is no longer disabled.

How much does it cost?
The monthly premium is 102 percent of the cost of the coverage: $612.00 for employee only, $1,224.00 for employee plus spouse, and $1,836.00 for family coverage.

When and how do I pay?
Your first payment is due 45 days after the date you elect. It must cover every month from October 1, 2026 through the month you pay. After that, payments are due on the first day of each month, and you may pay monthly. There is a grace period of 30 days after the first day of each month. Send payments to the COBRA Administrator, 100 Example Way, Suite 200, Anytown, ST 00000. If a payment is late or not paid in full by the end of the grace period, your continuation coverage will end and cannot be restored.

What about Medicare?
If you are eligible for Medicare, you should generally enroll when you first become eligible. If you do not enroll in Medicare and elect COBRA instead, you may have to pay a Part B late enrollment penalty and may have a gap in coverage. If you have both, Medicare generally pays first.

Keep the Plan informed of address changes
To protect your rights, keep the COBRA Administrator informed of any change of address for you, your spouse and your dependents, and keep a copy of any notices you send.

More information
This notice does not fully describe continuation coverage or other rights under the Plan. More complete information is available in the Plan's summary plan description or from the COBRA Administrator at (555) 010-0100.
"""

ERRORS = """COBRA Continuation Coverage Election Notice

Example Manufacturing Group Health Plan

Your coverage under the Plan will end on September 30, 2026 because of a qualifying event: the end of your employment.

You and your covered family members may continue coverage. To elect, return the enclosed election form. Your election must be received by October 31, 2026.

If you do not elect, your coverage ends.

COBRA continuation coverage is the same coverage you had before. It lasts up to 36 months.

The monthly premium is $650.00, which is 105 percent of the cost of coverage. Your first payment is due within 30 days after you elect. Payments are due on the first of each month, with a grace period of 15 days.

Questions? Call the benefits office at (555) 010-0100.
"""

GENERAL = """GENERAL NOTICE OF COBRA CONTINUATION COVERAGE RIGHTS

Example Manufacturing Group Health Plan

You are getting this notice because you recently gained coverage under the Example Manufacturing Group Health Plan (the Plan). This notice has important information about your right to COBRA continuation coverage, a temporary extension of coverage under the Plan. This notice does not fully describe continuation coverage or other rights under the Plan. More complete information is available in the Plan's summary plan description or from the Plan Administrator.

What is COBRA continuation coverage?
COBRA continuation coverage is a continuation of Plan coverage when it would otherwise end because of a life event, called a qualifying event. You, your spouse and your dependent children could become qualified beneficiaries if coverage under the Plan is lost because of a qualifying event. Qualified beneficiaries who elect COBRA must pay for it: the premium is up to 102 percent of the cost of coverage.

If you are an employee, you will become a qualified beneficiary if you lose coverage because your hours of employment are reduced (a reduction in hours) or your employment ends for any reason other than gross misconduct (termination). Your spouse becomes a qualified beneficiary if coverage is lost because of your death, a reduction in your hours, the end of your employment, your becoming entitled to Medicare, or a divorce or legal separation. Your dependent children become qualified beneficiaries for the same reasons, or if they stop being eligible as a dependent child.

When is COBRA continuation coverage available?
When the qualifying event is the end of employment, a reduction in hours, the death of the employee, or the employee becoming entitled to Medicare, the employer must notify the Plan Administrator of the qualifying event.

You must give notice of some qualifying events
For a divorce, a legal separation, or a child losing dependent status, you must notify the Plan Administrator within 60 days after the qualifying event occurs. Send the notice in writing to the Plan Administrator at the address below, on the form the Plan provides.

How long does COBRA last?
COBRA continuation coverage generally lasts up to 18 months for the end of employment or a reduction in hours, and up to 36 months for the other qualifying events. If the Social Security Administration determines that a qualified beneficiary is disabled, coverage may be extended by up to 11 months; you must notify the Plan Administrator of the disability determination within 60 days. A second qualifying event during the first 18 months can extend coverage for a spouse and dependent children up to 36 months in total.

Keep your Plan informed of address changes
To protect your family's rights, let the Plan Administrator know about any changes in the addresses of family members.

Plan contact information
Example Benefits Administration, Plan Administrator, 100 Example Way, Suite 200, Anytown, ST 00000. Telephone: (555) 010-0100.
"""

SAMPLES = {
    'cobra-election-clean': {
        'asOf': '2026-10-09', 'noticeType': 'election', 'noticeDate': '2026-10-09',
        'qualifyingEvent': {'type': 'termination', 'date': '2026-09-30', 'lossOfCoverageDate': '2026-09-30',
                            'employerIsAdministrator': True},
        'noticeText': ELECTION,
    },
    'cobra-election-errors': {
        'asOf': '2026-11-20', 'noticeType': 'election', 'noticeDate': '2026-11-20',
        'qualifyingEvent': {'type': 'termination', 'date': '2026-09-30', 'lossOfCoverageDate': '2026-09-30',
                            'employerIsAdministrator': True},
        'noticeText': ERRORS,
    },
    'cobra-general-clean': {
        'asOf': '2026-10-05', 'noticeType': 'general', 'noticeDate': '2026-10-05', 'coverageStartDate': '2026-09-01',
        'noticeText': GENERAL,
    },
}

if __name__ == '__main__':
    for name, body in SAMPLES.items():
        for d in (ROOT / 'public' / 'samples', ROOT / 'pylib' / 'tests' / 'fixtures'):
            (d / f'{name}.json').write_text(json.dumps(body, indent=1) + '\n')
    print('wrote', ', '.join(SAMPLES))
