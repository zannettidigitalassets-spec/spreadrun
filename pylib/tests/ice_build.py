"""Builds complete, internally consistent incurred cost submission workbooks for the ICE pre-check tests and samples.

Two layouts from the same invented numbers (fiscal year ending June 30, 2026):
  build('dcaa')  tab names A to O and the column headings of DCAA's ICE model
  build('own')   the contractor's own format: other tab names, headings, a rate in percent, totals in words
Every figure is computed here, so the math foots and the schedules tie. A test changes one thing with `mods`.
Values only (no formulas), as Excel saves them. The company and everyone in it are invented.
"""
import io
from decimal import ROUND_HALF_UP, Decimal

import openpyxl


def r0(x):
    return int(Decimal(str(x)).quantize(Decimal('1'), ROUND_HALF_UP))


COMPANY = 'Example Services Co.'
FYE_TEXT = 'Fiscal Year End - 06/30/2026'
FYE = '2026-06-30'

CONTRACTS = [
    # type, number, order type, order, labor, material, odc, sub, travel, physically complete
    ('COST', 'W900XX-24-C-0001', 'Task', '0001', 200000, 50000, 20000, 80000, 10000, 'N'),
    ('COST', 'W900XX-23-C-0002', 'Task', '0002', 150000, 30000, 15000, 40000, 5000, 'Y'),
    ('TIME AND MATERIAL', 'W900XX-25-D-0003', 'Task No.1', '0003', 60000, 5000, 0, 0, 2000, 'N'),
    ('COMMERCIAL WORK', 'Commercial Work', None, None, 100000, 70000, 10000, 30000, 3000, 'N'),
]
T_AND_M_LABOR = [('Program Manager', 120, 100), ('Engineer', 95, 400), ('Analyst', 70, 300)]
T_AND_M_OTHER = [('MATERIAL', 5000), ('TRAVEL', 2000)]

B_ROWS = [  # account, name, GL, adjustment, note
    (8001, 'Executive salaries', 250000, 0, ''),
    (8002, 'Accounting salaries', 90000, 0, ''),
    (8010, 'Professional fees', 40000, -6000, 'Lobbying costs removed as unallowable (FAR 31.205-22)'),
]
C_ROWS = [
    (7001, 'Indirect labor', 180000, 0, ''),
    (7002, 'Fringe benefits', 120000, 0, ''),
    (7003, 'Supplies', 17000, -2000, 'Personal items removed as unallowable'),
    (7004, 'Depreciation', 25000, 0, ''),
]
D_ROWS = [(6001, 'Rent', 70000, 0, ''), (6002, 'Utilities', 10000, 0, '')]
D_ALLOC = [('OH Base', 6000), ('GA Base', 2000)]
COM = {'oh': 8000, 'ga': 3000}


def numbers():
    n = {}
    occ = sum(g + a for _, _, g, a, _ in D_ROWS)
    sq = sum(x for _, x in D_ALLOC)
    n['occ'] = occ
    n['occ_base'] = sq
    n['occ_to'] = {k: r0(occ * x / sq) for k, x in D_ALLOC}
    n['c_pool'] = sum(g + a for _, _, g, a, _ in C_ROWS) + n['occ_to']['OH Base']
    n['b_pool'] = sum(g + a for _, _, g, a, _ in B_ROWS) + n['occ_to']['GA Base']
    labor = sum(c[4] for c in CONTRACTS)
    n['labor'] = labor
    n['oh_rate'] = round(n['c_pool'] / labor, 4)
    rows = []
    for c in CONTRACTS:
        direct = sum(c[4:9])
        oh = r0(c[4] * n['oh_rate'])
        rows.append({'c': c, 'direct': direct, 'oh': oh, 'ga_base': direct + oh})
    n['ga_base'] = sum(x['ga_base'] for x in rows)
    n['ga_rate'] = round(n['b_pool'] / n['ga_base'], 4)
    n['com_oh_rate'] = round(COM['oh'] / labor, 5)
    n['com_ga_rate'] = round(COM['ga'] / n['ga_base'], 5)
    for x in rows:
        x['ga'] = r0(x['ga_base'] * n['ga_rate'])
        x['total'] = x['ga_base'] + x['ga']
        x['com_oh'] = r0(x['c'][4] * n['com_oh_rate'])
        x['com_ga'] = r0(x['ga_base'] * n['com_ga_rate'])
        x['com'] = x['com_oh'] + x['com_ga']
        x['grand'] = x['total'] + x['com']
    n['h'] = rows
    tm = []
    for cat, rate, hrs in T_AND_M_LABOR:
        tm.append([cat, rate, hrs, None, rate * hrs, 0, 0, rate * hrs])
    for other, amt in T_AND_M_OTHER:
        ga = r0(amt * n['ga_rate'])
        tm.append([None, None, None, other, 0, amt, ga, amt + ga])
    n['k'] = tm
    n['k_total'] = sum(x[7] for x in tm)
    return n


def col_sums(rows, idx):
    return [sum(r[i] for r in rows) for i in idx]


def sheets_dcaa(n, own=False):
    S = {}
    head = lambda letter, title: [[f'Schedule {letter}'], [COMPANY], [], [title], [FYE_TEXT], [], []]  # noqa: E731

    # A
    a_rows = [['OH', 'OVERHEAD', n['c_pool'], n['labor'], n['oh_rate']],
              ['GA', 'GENERAL AND ADMIN', n['b_pool'], n['ga_base'], n['ga_rate']],
              ['COM', 'OVERHEAD COM', COM['oh'], n['labor'], n['com_oh_rate']],
              ['COM', 'GENERAL AND ADMIN COM', COM['ga'], n['ga_base'], n['com_ga_rate']],
              ['INTER', 'OCCUPANCY', n['occ'], n['occ_base'], round(n['occ'] / n['occ_base'], 4)]]
    S['A'] = head('A', 'Summary of Claimed Indirect Rates') + [[None, 'COST_TYPE', 'POOL_NAME', 'POOL_AMOUNT', 'BASE_AMOUNT', 'RATE']] \
        + [[None] + r for r in a_rows]

    def pool(letter, title, ctype, pname, rows, alloc):
        hdr = [None, 'COST_TYPE', 'POOL_NAME', 'ALLOCATED_FROM', 'BASE_TYPE', 'ACCOUNT_NUMBER', 'ACCOUNT_NAME', 'DEPARTMENT',
               'GL_BALANCE', 'ADJUSTMENTS', 'TOTAL_CLAIMED', 'FAR/DFAR_CLAUSES', 'COMMENTS']
        body = [[None, ctype, pname, None, None, acct, name, None, gl, adj, gl + adj, None, note or None]
                for acct, name, gl, adj, note in rows]
        if alloc:
            body.append([None, ctype, pname, 'OCCUPANCY', 'Sqft', None, 'Occupancy allocation', None, alloc, 0, alloc, None, None])
        g, a, t = col_sums([[r[8], r[9], r[10]] for r in body], [0, 1, 2])
        return head(letter, title) + [[], hdr] + body + [[None, None, None, f'TOTAL {pname} EXPENSE POOL', None, None, None,
                                                          None, g, a, t]]
    S['B'] = pool('B', 'General & Administrative Expenses', 'GA', 'GENERAL AND ADMIN', B_ROWS, n['occ_to']['GA Base'])
    S['C'] = pool('C', 'Overhead/Indirect Expenses and Rates', 'OH', 'OVERHEAD', C_ROWS, n['occ_to']['OH Base'])
    # D
    hdr = [None, 'COST_TYPE', 'POOL_NAME', 'ALLOCATED_FROM', 'BASE_TYPE', 'ACCOUNT_NUMBER', 'ACCOUNT_NAME', 'DEPARTMENT',
           'GL_BALANCE', 'ADJUSTMENTS', 'TOTAL_CLAIMED', 'FAR/DFAR_CLAUSES', 'COMMENTS', 'BASE', '%_OF_TOTAL',
           'CLAIMED_EXPENSE_ALLOCATION']
    body = [[None, 'INTER', 'OCCUPANCY', None, None, a, nm, None, g, ad, g + ad] for a, nm, g, ad, _ in D_ROWS]
    alloc = [[None, 'INTER', 'OCCUPANCY', None, 'Sqft', None, k, None, None, None, None, None, None, x,
              round(x / n['occ_base'], 4), n['occ_to'][k]] for k, x in D_ALLOC]
    S['D'] = head('D', 'Intermediate Allocations') + [[], hdr] + body + [
        [None, None, None, None, None, None, 'TOTAL W/ ALLOCATION', None, n['occ'], 0, n['occ']], []] + alloc + [
        [None, None, 'OCCUPANCY', None, None, None, '**TOTAL**', None, None, None, None, None, None, n['occ_base'], None,
         sum(n['occ_to'].values())]]
    # E
    hdr = [None, 'COST_TYPE', 'POOL_NAME', 'BASE_TYPE', 'ACCOUNT_NUMBER', 'ACCOUNT_NAME', 'DEPARTMENT', 'GL_BALANCE',
           'ADJUSTMENTS', 'TOTAL_CLAIMED', 'FAR/DFAR_CLAUSES', 'COMMENTS']
    h = n['h']
    ga_elems = [('Labor', 'Contract Labor', n['labor']), ('Material', 'Contract Material', sum(x['c'][5] for x in h)),
                ('ODC', 'Other Direct Costs', sum(x['c'][6] for x in h)), ('Subcontracts', 'Subcontracts', sum(x['c'][7] for x in h)),
                ('Travel', 'Contract Travel', sum(x['c'][8] for x in h)), ('Overhead', 'Overhead applied', sum(x['oh'] for x in h))]
    body = [[None, 'OH', 'OVERHEAD', 'Labor', None, 'Direct Labor', None, n['labor'], 0, n['labor']]]
    body += [[None, 'GA', 'GENERAL_AND_ADMIN', bt, None, nm, None, v, 0, v] for bt, nm, v in ga_elems]
    body += [[None, 'INTER', 'OCCUPANCY', 'Sqft', None, k, None, x, 0, x] for k, x in D_ALLOC]
    S['E'] = head('E', 'Claimed Allocation Bases') + [[], hdr] + body + [[]] + [
        [None, 'OH', 'OVERHEAD', None, None, 'TOTAL', None, n['labor'], 0, n['labor']],
        [None, 'GA', 'GENERAL_AND_ADMIN', None, None, 'TOTAL', None, n['ga_base'], 0, n['ga_base']],
        [None, 'INTER', 'OCCUPANCY', None, None, 'TOTAL', None, n['occ_base'], 0, n['occ_base']]]
    # F
    hdr = [None, 'Category', 'Attribute', 'Total Net Book Value', 'COM for Cost Accounting Period', 'Allocation Base for Period',
           'Facilities Capital COM Factors']
    S['F'] = head('F', 'Facilities Capital Cost of Money Factors Computation') + [[], hdr,
        [None, 'Overhead Pools', 'OVERHEAD', 300000, COM['oh'], n['labor'], n['com_oh_rate']],
        [None, 'G&A Expense Pools', 'GENERAL_AND_ADMIN', 100000, COM['ga'], n['ga_base'], n['com_ga_rate']],
        [None, 'TOTAL', '**TOTAL**', 400000, COM['oh'] + COM['ga']]]
    # G
    elems = [('LABOR', n['labor']), ('MATERIAL', ga_elems[1][2]), ('ODC', ga_elems[2][2]), ('SUBCONTRACT', ga_elems[3][2]),
             ('TRAVEL', ga_elems[4][2])]
    S['G'] = head('G', 'Reconciliation of Books of Account and Claimed Direct Costs by Major Cost Element') + [[],
        [None, 'COST_ELEMENT', 'AMOUNT_PER_G/L', 'ADJUSTMENTS', 'CLAIMED']] + [[None, e, v, 0, v] for e, v in elems] + [
        [None, 'TOTAL', sum(v for _, v in elems), 0, sum(v for _, v in elems)]]
    # H
    hdr = [None, 'CONTRACT_TYPE', 'CONTRACT_NUMBER', 'CONTRACT_ORDER_TYPE', 'ORDER_NUMBER', 'CLAIM_TYPE', 'LABOR', 'MATERIAL',
           'ODC', 'SUBCONTRACT', 'TRAVEL', 'TOTAL_DIRECT_COST', 'OVERHEAD', 'G&A_BASE', 'G&A_COST', 'TOTAL_COST',
           'OVERHEAD COM', 'G&A_COM', 'TOTAL_COM_COST', 'GRAND_TOTAL']

    def hrow(x):
        c = x['c']
        return [None, c[0], c[1], c[2], c[3], 'CLAIMED', c[4], c[5], c[6], c[7], c[8], x['direct'], x['oh'], x['ga_base'],
                x['ga'], x['total'], x['com_oh'], x['com_ga'], x['com'], x['grand']]
    body, subtot = [], []
    for t in ('COST', 'TIME AND MATERIAL', 'COMMERCIAL WORK'):
        rs = [hrow(x) for x in h if x['c'][0] == t]
        body += rs
        st = [None, f'{t} - SUBTOTAL', 'TOTAL', None, None, None] + col_sums(rs, range(6, 20))
        body.append(st)
        subtot.append(st)
    body.append([None, None, 'GRAND TOTAL', None, None, None] + col_sums(subtot, range(6, 20)))
    S['H'] = [['Schedule H'], [COMPANY], [], [], ['Schedule of Direct Costs by Contract/Subcontract'],
              ['        and Indirect Expense Applied at Claimed Rates'], [FYE_TEXT], [], [], hdr] + body
    # I
    hdr = [None, 'CONTRACT_TYPE', 'CONTRACT_NUMBER', 'CONTRACT_ORDER_TYPE', 'ORDER_NUMBER', 'CLAIM_TYPE', 'SETTLED',
           'UNSETTLED_PRIOR_YEARS', 'UNSETTLED_CURRENT_YEAR', 'TOTAL_CUMULATIVE_SETTLED_OR_CLAIMED', 'BILLED',
           'OVER_(UNDER)_BILLING', 'PHYSICALLY_COMPLETE']
    cost = []
    prior = {'W900XX-24-C-0001': (0, 310000), 'W900XX-23-C-0002': (420000, 380000)}
    for x in h:
        c = x['c']
        if c[0] != 'COST':
            continue
        st, pr = prior[c[1]]
        cum = st + pr + x['grand']
        billed = cum - 5000
        cost.append([None, 'COST TYPE AND FLEXIBLY PRICED', c[1], c[2], c[3], 'CLAIMED', st, pr, x['grand'], cum, billed,
                     billed - cum, c[9]])
    tm_c = next(x['c'] for x in h if x['c'][0] == 'TIME AND MATERIAL')
    tm = [[None, 'T&M', tm_c[1], tm_c[2], tm_c[3], 'CLAIMED', 0, 0, n['k_total'], n['k_total'], n['k_total'] - 1000,
           -1000, tm_c[9]]]
    s1 = [None, 'COST TYPE AND FLEXIBLY PRICED', 'SUBTOTAL: COST TYPE AND FLEXIBLY PRICED', None, None, None] + col_sums(cost, range(6, 12))
    s2 = [None, 'T&M', 'SUBTOTAL: T&M', None, None, None] + col_sums(tm, range(6, 12))
    S['I'] = [['Schedule I'], [COMPANY], [], [], [None, 'Schedule of Cumulative Direct and Indirect Costs Claimed and Billed'],
              [None, 'On Cost/Flexibly Priced and T&M Contracts and Subcontracts'], [None, FYE_TEXT], [], [], hdr] + cost + [s1] + tm + [s2] + [
        [None, '**TOTAL**', None, None, None, None] + col_sums([s1, s2], range(0 + 6, 12))]
    # J
    hdr = [None, 'CONTRACT_NUMBER', 'CONTRACT_ORDER_TYPE', 'ORDER_NUMBER', 'SUBCONTRACT_NUMBER', 'SUBCONTRACTOR_NAME',
           'SUBCONTRACTOR_ADDRESS', 'SUBCONTRACTOR_POC_NAME', 'SUBCONTRACT_VALUE', 'FY_COST_INCURRED', 'AWARD_TYPE']
    S['J'] = head('J', 'Subcontract Information') + [[], hdr,
        [None, CONTRACTS[0][1], 'Task', '0001', 'SUB-0001', 'Subcontractor A', '1 Example Way', 'Contracts office', 250000, CONTRACTS[0][7], 'CPFF'],
        [None, CONTRACTS[1][1], 'Task', '0002', 'SUB-0002', 'Subcontractor B', '2 Example Way', 'Contracts office', 120000, CONTRACTS[1][7], 'FFP']]
    # K
    hdr = [None, 'CONTRACT_NUMBER', 'CONTRACT_ORDER_TYPE', 'ORDER_NUMBER', 'LABOR_CATEGORY', 'LABOR_RATE', 'LABOR_HOURS',
           'OTHER_CATEGORY', 'LABOR_COST', 'NONLABOR_COST', 'GA_COST', 'TOTAL_COST', 'COMMENTS']
    rows = [[None, tm_c[1], tm_c[2], tm_c[3]] + r for r in n['k']]
    S['K'] = head('K', 'Summary of Hours and Amounts on Time and Material /Labor Hour Contracts') + [[], hdr] + rows + [[],
        [None] * 8 + ['TOTAL', 'TOTAL', 'TOTAL', 'TOTAL'],
        [None, tm_c[1], tm_c[2], tm_c[3], None, None, None, None] + col_sums(rows, range(8, 12))]
    # L
    oh_labor, ga_labor = C_ROWS[0][2], B_ROWS[0][2] + B_ROWS[1][2]
    lab = [[None, 'Direct Labor', None, None, n['labor']], [None, 'OVERHEAD', 7001, 'Indirect labor', oh_labor],
           [None, 'GENERAL AND ADMIN', 8001, 'Executive and accounting salaries', ga_labor]]
    tot = n['labor'] + oh_labor + ga_labor
    S['L'] = head('L', 'Reconciliation of Total Payroll per IRS Form 941') + [[],
        [None, 'POOL_NAME', 'ACCOUNT_NUMBER', 'ACCOUNT_DESCRIPTION', 'GENERAL_LEDGER_(COST)']] + lab + [
        [None, None, None, 'TOTAL LABOR DISTRIBUTION', tot], [], [None, 'Form 941', None, 'Wages per Forms 941, four quarters', tot],
        [None, None, None, 'TOTAL PAYROLL', tot]]
    # M
    S['M'] = head('M', 'Listing of Decisions/Agreements, or Approvals and Accounting Changes') + [[],
        [None, 'SUBJECT/TOPIC', 'COMMENTS'], [None, 'None', 'No decisions, agreements, approvals or accounting changes this fiscal year.']]
    # N
    S['N'] = [['Schedule N'], [None, COMPANY], [], [], [None, 'Certificate of Final Indirect Costs'], [None, FYE_TEXT], [], [],
              [None, 'This is to certify that I have reviewed this proposal to establish final indirect cost rates and to '
                     'the best of my knowledge and belief:'],
              [None, '1. All costs included in the FY2026 final indirect cost rate proposal dated September 15, 2026 to '
                     'establish final indirect cost rates for the fiscal year ended June 30, 2026 are allowable in accordance with the cost '
                     'principles of the FAR and its supplements; and'],
              [None, '2. This proposal does not include any costs which are expressly unallowable under applicable cost '
                     'principles of the FAR or its supplements.'], [],
              [None, f'Firm: {COMPANY}'], [None, 'Signature: Signed copy submitted with this proposal'],
              [None, 'Name of Certifying Official: Chief Financial Officer (name on the signed copy)'],
              [None, 'Title: Chief Financial Officer'], [None, 'Date of Execution: 2026-09-15']]
    # O
    c2 = CONTRACTS[1]
    S['O'] = head('O', 'Schedule of Contract Closing Information') + [[],
        [None, 'CONTRACT_TYPE', 'CONTRACT_NUMBER', 'ORDER_NUMBER', 'PERFORMANCE_PERIOD_(FROM)', 'PERFORMANCE_PERIOD_(TO)',
         'READY_TO_CLOSE', 'CONTRACT_CEILING_AMOUNT', 'FEE', 'LOE_CUMULATIVE_HRS_REQUIRED', 'LOE_CUMULATIVE_HRS_ACTUAL'],
        [None, 'Cost', c2[1], c2[3], '2023-01-01', '2026-03-31', 'Yes', 1500000, 90000, 20000, 19650]]
    return S


def sheets_own(n):
    """The same submission in a contractor's own format."""
    d = sheets_dcaa(n)
    h = n['h']
    S = {}
    S['Sch A Rates'] = [['Schedule A: Summary of Claimed Indirect Rates'], [COMPANY], ['Fiscal year ended June 30, 2026'], [],
                        ['Indirect Pool', 'Pool Costs ($)', 'Allocation Base ($)', 'Claimed Rate (%)'],
                        ['Overhead', n['c_pool'], n['labor'], round(n['oh_rate'] * 100, 2)],
                        ['General and Administrative', n['b_pool'], n['ga_base'], round(n['ga_rate'] * 100, 2)],
                        ['Overhead cost of money', COM['oh'], n['labor'], round(n['com_oh_rate'] * 100, 3)],
                        ['G&A cost of money', COM['ga'], n['ga_base'], round(n['com_ga_rate'] * 100, 3)],
                        ['Occupancy (intermediate)', n['occ'], n['occ_base'], round(n['occ'] / n['occ_base'], 4) * 100]]

    def pool(title, rows, alloc, label):
        body = [[a, nm, g, ad, g + ad, note or None] for a, nm, g, ad, note in rows]
        body.append([None, 'Occupancy allocation', alloc, 0, alloc, None])
        g, a, t = col_sums([[r[2], r[3], r[4]] for r in body], [0, 1, 2])
        return [[title], [COMPANY], [], ['Account', 'Description', 'Per Books', 'Adjustment', 'Claimed', 'Explanation']] + body + [
            [None, label, g, a, t]]
    S['B - G&A Expenses'] = pool('Schedule B: General and Administrative Expenses', B_ROWS, n['occ_to']['GA Base'], 'Total G&A expenses')
    S['Overhead Pool'] = pool('Schedule C: Overhead Expenses', C_ROWS, n['occ_to']['OH Base'], 'Total overhead expenses')
    S['Occupancy Pool'] = [['Intermediate Pool: Occupancy Expenses'], [COMPANY], [],
                           ['Account', 'Description', 'Per Books', 'Adjustment', 'Claimed']] + [
        [a, nm, g, ad, g + ad] for a, nm, g, ad, _ in D_ROWS] + [[None, 'Total occupancy expenses', n['occ'], 0, n['occ']], [],
        ['Recipient', 'Square feet (base)', 'Percent of base', 'Dollars allocated']] + [
        [k, x, round(x / n['occ_base'] * 100, 2), n['occ_to'][k]] for k, x in D_ALLOC] + [
        ['Total', n['occ_base'], None, sum(n['occ_to'].values())]]
    S['Sch E Bases'] = [['Schedule E: Allocation Bases'], [COMPANY], [], ['Pool', 'Base element', 'Amount']] + [
        ['Overhead', 'Direct labor', n['labor']], [None, 'Total overhead base', n['labor']], []] + [
        ['G&A', r[5], r[9]] for r in d['E'][9:] if len(r) > 9 and r[1] == 'GA' and r[5] != 'TOTAL'] + [[None, 'Total G&A base', n['ga_base']], []] + [
        ['Occupancy', k, x] for k, x in D_ALLOC] + [[None, 'Total occupancy base', n['occ_base']]]
    S['Sch F Cost of Money'] = [['Schedule F: Facilities Capital Cost of Money'], [COMPANY], [],
                                ['Pool', 'Net book value', 'Cost of money', 'Allocation base', 'Factor'],
                                ['Overhead', 300000, COM['oh'], n['labor'], n['com_oh_rate']],
                                ['G&A', 100000, COM['ga'], n['ga_base'], n['com_ga_rate']],
                                ['Total', 400000, COM['oh'] + COM['ga']]]
    g = d['G'][8:]
    S['Sch G Recon'] = [['Schedule G: Reconciliation of Books of Account and Claimed Direct Costs'], [COMPANY], [],
                        ['Cost element', 'Per general ledger', 'Adjustments', 'Claimed']] + [
        [r[1].title() if r[1] != 'TOTAL' else 'Total direct costs', r[2], r[3], r[4]] for r in g]
    hrows = []
    for x in h:
        c = x['c']
        hrows.append([c[1], c[0].title(), c[4], c[5], c[6], c[7], c[8], x['direct'], x['oh'], x['ga_base'], x['ga'], x['total']])
    tot = ['Total', None] + col_sums(hrows, range(2, 12))
    S['Sch H Contracts'] = [['Schedule H: Direct Costs by Contract and Indirect Expense Applied at Claimed Rates'], [COMPANY], [],
                            ['Contract', 'Contract Type', 'Direct Labor', 'Material', 'Other Direct', 'Subcontracts', 'Travel',
                             'Total Direct', 'Overhead', 'G&A Base', 'G&A', 'Total Cost']] + hrows + [tot]
    S['Sch I Claimed v Billed'] = [['Schedule I: Cumulative Costs Claimed and Billed'], [COMPANY], [],
                                   ['Contract', 'Contract Type', 'Settled', 'Prior years unsettled', 'Current year claimed',
                                    'Cumulative claimed', 'Billed', 'Physically complete']] + [
        [r[2], 'Cost' if r[1].startswith('COST') else 'T&M', r[6], r[7], r[8], r[9], r[10], r[12]]
        for r in d['I'][10:] if r[2] and not str(r[2]).startswith('SUBTOTAL') and r[1] != '**TOTAL**']
    # current year claimed for cost-type contracts includes cost of money in DCAA's H grand total; this H has no COM
    # columns, so I here carries the H total cost
    for r in S['Sch I Claimed v Billed'][4:]:
        hx = next((x for x in h if x['c'][1] == r[0]), None)
        if hx and r[1] == 'Cost':
            r[4] = hx['total']
            r[5] = r[2] + r[3] + r[4]
            r[6] = r[5] - 5000
    S['Sch I Claimed v Billed'].append(['Total', None] + col_sums(S['Sch I Claimed v Billed'][4:], range(2, 7)))
    S['Sch J Subcontracts'] = [['Schedule J: Subcontract Information'], [COMPANY], [],
                               ['Prime contract number', 'Subcontract number', 'Subcontractor name', 'Address', 'Point of contact',
                                'Subcontract value', 'FY cost incurred', 'Award type']] + [
        [r[1], r[4], r[5], r[6], r[7], r[8], r[9], r[10]] for r in d['J'][9:]]
    k = [[CONTRACTS[2][1]] + [x[0] or x[3], x[1], x[2], x[4], x[5], x[6], x[7]] for x in n['k']]
    S['Sch K T&M'] = [['Schedule K: Time-and-Materials and Labor-Hour Contracts'], [COMPANY], [],
                      ['Contract', 'Labor category or other cost', 'Rate', 'Hours', 'Labor Amount', 'Other cost', 'G&A',
                       'Total']] + k + [['Total', None, None, None] + col_sums(k, range(4, 8))]
    S['Sch L Payroll'] = [['Schedule L: Reconciliation of Payroll per IRS Form 941 to Labor Distribution'], [COMPANY], [],
                          ['Labor category', 'Amount']] + [[r[1] if r[1] != 'Direct Labor' else 'Direct labor', r[4]] for r in d['L'][9:12]] + [
        ['Total labor distribution', sum(r[4] for r in d['L'][9:12])], ['Total wages per Forms 941', sum(r[4] for r in d['L'][9:12])]]
    S['M - Changes'] = [['Schedule M: Decisions, Agreements, Approvals and Accounting Changes'], [COMPANY], [],
                        ['Subject', 'Description'], ['None to report', 'There were no decisions, agreements, approvals or '
                                                    'accounting changes this fiscal year.']]
    S['Certificate'] = [['Schedule N - Certificate of Final Indirect Costs']] + [r[1:] for r in d['N'][1:] if r]
    S['Sch O Closing'] = [['Schedule O: Contract Closing Information'], [COMPANY], [],
                          ['Contract', 'Period of performance from', 'Period of performance to', 'Ceiling', 'Fee',
                           'LOE hours required', 'LOE hours actual', 'Ready to close']] + [
        [r[2], r[4], r[5], r[7], r[8], r[9], r[10], r[6]] for r in d['O'][9:]]
    return S


def build(style='dcaa', mods=None, extra_sheets=None):
    n = numbers()
    sheets = sheets_dcaa(n) if style == 'dcaa' else sheets_own(n)
    if extra_sheets:
        sheets.update(extra_sheets)
    if mods:
        mods(sheets, n)
    wb = openpyxl.Workbook()
    wb.remove(wb.active)
    for name, rows in sheets.items():
        if rows is None:
            continue
        ws = wb.create_sheet(name)
        for r in rows:
            ws.append(list(r) if r else [])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def find(rows, label, col=None):
    """(row index, column index) of the first cell whose text equals label (or contains it)."""
    for i, r in enumerate(rows):
        for j, v in enumerate(r or []):
            if isinstance(v, str) and (v == label or label in v) and (col is None or j == col):
                return i, j
    raise KeyError(label)
