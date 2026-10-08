"""Build test inputs for the HCRIS pre-audit QA from real CMS HCRIS extracts.

CMS publishes the HCRIS hospital cost report dataset (HOSP10FY<year>.ZIP: RPT, NMRC and ALPHA files) from the
electronic cost report files hospitals file. ecr_from_hcris() writes those rows back into the ECR record layout of
CMS Pub. 15-2, chapter 40, section 4095, Table 1, so the engine is tested on real filed numbers.

The fixtures under fixtures/hcris/ are rows for whole cost reports cut from HOSP10FY2024.ZIP (downloaded October 8,
2026 from downloads.cms.gov/FILES/HCRIS/). One change: provider-based physician identifiers on Worksheet A-8-2,
column 2, are replaced by "PHYSICIAN n".

Listings (Exhibits 2A, 3B and 3C) are not in HCRIS. listing_rows() makes invented, de-identified rows that add up to
the amounts the cost report claims, and xlsx() writes them in the CMS template layout.
"""
import csv
import datetime as dt
import gzip
import io
import random
import zipfile
from pathlib import Path

FIX = Path(__file__).parent / 'fixtures' / 'hcris'


def load_fixture(name):
    """{'rpt': [...], 'nmrc': [(wk, line5, col5, value)], 'alpha': [(wk, line5, col5, text)]}"""
    out = {'rpt': None, 'nmrc': [], 'alpha': []}
    with gzip.open(FIX / f'{name}.csv.gz', 'rt', newline='') as fh:
        for row in csv.reader(fh):
            kind = row[0]
            if kind == 'RPT':
                out['rpt'] = row[1:]
            elif kind == 'NMRC':
                out['nmrc'].append((row[1], row[2], row[3], row[4]))
            elif kind == 'ALPHA':
                out['alpha'].append((row[1], row[2], row[3], row[4]))
    return out


def julian(d):
    return f'{d.year}{d.timetuple().tm_yday:03d}'


def mdy(s):
    m, d, y = s.split('/')
    return dt.date(int(y), int(m), int(d))


def fmt_num(v):
    x = float(v)
    if x == int(x):
        return str(int(x))
    s = ('%.6f' % x).rstrip('0')
    if s.startswith('0.'):
        s = s[1:]
    elif s.startswith('-0.'):
        s = '-' + s[2:]
    return s


APPROVED = ['2026181', '2025365', '2025181', '2024275', '2023274', '2023213', '2023091', '2023001', '2022274']


def ecr_from_hcris(fx, *, ccn=None, spec_date=None, created=None, override=None, drop=(),
                   name=None, type4=True, crlf=True):
    """ECR bytes. override: {(wk, line5, col5): value} replaces or adds type 3 values; drop: keys to leave out."""
    rpt = fx['rpt']
    ccn = ccn or rpt[2]
    fyb, fye = mdy(rpt[5]), mdy(rpt[6])
    spec_date = spec_date or max(a for a in APPROVED if a <= julian(fye))
    created = created or fye + dt.timedelta(days=90)
    recs = []
    r1 = f'1{"":10} 1   {ccn}{julian(fyb)}{julian(fye)}1A09P001{julian(created)}{spec_date}'
    recs.append(r1)
    recs.append(f'1{"":10}04{"":7}14:30')
    data = {}
    labels = {}
    for wk, ln, col, v in fx['alpha']:
        if wk == 'A000000' and col == '00000':
            labels[(wk, ln, col)] = (v[:5], v[5:])
        elif wk.endswith('*'):
            labels[(wk, ln, col)] = ('', v)
        else:
            data[(wk, ln, col)] = ('A', v)
    for wk, ln, col, v in fx['nmrc']:
        data[(wk, ln, col)] = ('N', v)
    for k, v in (override or {}).items():
        data[k] = ('N', v) if isinstance(v, (int, float)) else ('A', v)
    for k in drop:
        data.pop(k, None)
    if name:
        scrub_identity(data, rpt[2], ccn, name)
    for (wk, ln, col), (code, text) in sorted(labels.items()):
        if code:
            recs.append(f'2{wk}  {ln}{col}{code}{text.upper()[:35]}')
        else:
            recs.append(f'2{wk}  {ln}{col}{text.upper()[:10]}')
    for (wk, ln, col), (kind, v) in sorted(data.items()):
        if kind == 'N':
            if float(v) == 0:
                continue   # all records with zero values are dropped
            recs.append(f'3{wk}  {ln}{col}{fmt_num(v):>16}')
        else:
            if wk == 'S200001' and ln == '00300' and col == '00200' and ccn != rpt[2]:
                v = ccn
            recs.append(f'3{wk}  {ln}{col}{str(v).upper()[:36]}')
    if type4:
        for n in ('1', '1.01', '1.02'):
            recs.append(f'4{"":10}{n:<6}SAMPLE ONLY, NOT A VENDOR CODE')
    eol = '\r\n' if crlf else '\n'
    return (eol.join(recs) + eol).encode('ascii')


def scrub_identity(data, real_ccn, ccn, name):
    """Sample files: replace the hospital's name, address and CCNs on Worksheet S-2, Part I. Amounts stay as filed."""
    for k in list(data):
        wk, ln, col = k
        kind, v = data[k]
        if wk != 'S200001' or kind != 'A':
            continue
        n = int(ln[:3])
        if n == 1 and col == '00100':
            data[k] = ('A', '100 SAMPLE STREET')
        elif n == 2:
            data[k] = ('A', {'00100': 'SAMPLETOWN', '00200': 'XX', '00300': '00000', '00400': 'SAMPLE COUNTY'}.get(col, v))
        elif 3 <= n <= 19 and col == '00100':
            data[k] = ('A', name if n == 3 else f'{name} UNIT {n - 3}')
        elif 3 <= n <= 19 and col == '00200' and len(v) == 6:
            data[k] = ('A', ccn[:2] + v[2:] if n > 3 else ccn)
        elif 140 <= n <= 143:
            data[k] = ('A', 'SAMPLE HOME OFFICE' if col == '00100' else 'XX')


def amounts(fx):
    v = {}
    for wk, ln, col, x in fx['nmrc']:
        v[(wk, ln, col)] = float(x)
    return v


def split_total(total, n, rng):
    """n positive amounts (cents) that add up to total exactly."""
    cents = round(total * 100)
    if n <= 0 or cents <= 0:
        return []
    n = min(n, cents, 2500)
    cuts = sorted(rng.sample(range(1, cents), n - 1)) if n > 1 else []
    parts = [b - a for a, b in zip([0] + cuts, cuts + [cents])]
    return [p / 100 for p in parts]


def rows_2a(total, dual_total, start, end, rng, prefix):
    """Exhibit 2A rows: deductible and coinsurance write-offs after at least 120 days of collection effort."""
    rows = []
    span = (end - start).days
    n_dual = max(1, round(dual_total / 900)) if dual_total else 0
    n_other = max(1, round((total - dual_total) / 700)) if total - dual_total > 0 else 0
    for i, a in enumerate(split_total(dual_total, n_dual, rng) + split_total(total - dual_total, n_other, rng)):
        dual = i < n_dual
        wo = start + dt.timedelta(days=rng.randint(5, span - 1))
        dos = wo - dt.timedelta(days=rng.randint(200, 400))
        ra = dos + dt.timedelta(days=rng.randint(10, 30))
        bill = ra + dt.timedelta(days=rng.randint(1, 20))
        ded = round(min(a, 1632.0), 2)
        coins = round(a - ded, 2)
        rows.append({'from': dos, 'to': dos + dt.timedelta(days=rng.randint(0, 5)), 'acct': f'{prefix}{i + 1:06d}',
                     'medicaid': 'Y' if dual else '', 'indigent': 'N', 'ra': ra,
                     'mcaid_ra': (ra + dt.timedelta(days=rng.randint(20, 60))) if dual else None,
                     'bene_resp': 0.0 if dual else a, 'first_bill': None if dual else bill,
                     'ar_wo': wo, 'agency': 'N', 'ceased': wo, 'mcr_wo': wo, 'deductible': ded,
                     'coinsurance': coins, 'paid_prior': 0.0, 'allowable': a})
    return rows


def rows_3b(unins, ins, start, end, rng):
    rows = []
    span = (end - start).days
    n1 = max(1, round(unins / 6000)) if unins else 0
    n3 = max(1, round(ins / 900)) if ins else 0
    for i, a in enumerate(split_total(unins, n1, rng)):
        wo = start + dt.timedelta(days=rng.randint(0, span))
        dos = wo - dt.timedelta(days=rng.randint(30, 200))
        rows.append({'from': dos, 'to': dos + dt.timedelta(days=rng.randint(0, 4)), 'acct': f'C{i + 1:07d}',
                     'status': '1', 'charges': a, 'phys': 0.0, 'uninsured_disc': a, 'charity_total': a, 'wo': wo})
    for i, a in enumerate(split_total(ins, n3, rng)):
        wo = start + dt.timedelta(days=rng.randint(0, span))
        dos = wo - dt.timedelta(days=rng.randint(30, 200))
        charges = round(a * rng.uniform(4, 9), 2)
        third = round(charges - a - round(charges * 0.3, 2), 2)
        rows.append({'from': dos, 'to': dos + dt.timedelta(days=rng.randint(0, 4)), 'acct': f'I{i + 1:07d}',
                     'status': '3', 'primary': 'COMMERCIAL PLAN', 'charges': charges, 'phys': 0.0, 'ded_coins': a,
                     'third_party': third, 'contractual': round(charges * 0.3, 2), 'other_charity': a,
                     'charity_total': a, 'wo': wo})
    return rows


def rows_3c(total, start, end, rng):
    rows = []
    span = (end - start).days
    n = max(1, round(total / 2500))
    for i, a in enumerate(split_total(total, n, rng)):
        wo = start + dt.timedelta(days=rng.randint(0, span))
        dos = wo - dt.timedelta(days=rng.randint(130, 420))
        insured = rng.random() < 0.6
        paid = round(a * rng.uniform(0, 0.3), 2)
        third = round(a * rng.uniform(1, 5), 2) if insured else 0.0
        contractual = round(third * 0.4, 2) if insured else 0.0
        phys = round(a * rng.uniform(0, 0.2), 2) if rng.random() < 0.3 else 0.0
        # charges = bad debt + reductions (+ a little): the prorated cap of column 17 is then at least the bad debt
        charges = round(a + paid + third + contractual + rng.uniform(0, 50), 2)
        rows.append({'from': dos, 'to': dos + dt.timedelta(days=rng.randint(0, 6)), 'acct': f'B{i + 1:07d}',
                     'status': '3' if insured else '1', 'primary': 'COMMERCIAL PLAN' if insured else '',
                     'ipop': rng.choice(['IP', 'OP']), 'charges': round(charges, 2), 'phys': phys,
                     'patient_paid': paid, 'third_party': third, 'charity': 0.0, 'contractual': contractual,
                     'wo': wo, 'bad_debt': a})
    return rows


# ------------------------------------------------------------------ listing files
LAYOUT = {
    '2A': {'id': 'Medicare Bad Debt Listing', 'labels_row': 14,
           'header': [('Provider Name', 'name'), ('Provider Number (CCN)', 'ccn'), ('Subprovider CCN', 'component'),
                      ('FYB', 'fyb'), ('FYE', 'fye'), ('Inpatient / Outpatient', 'ipop'), ('Prepared By', 'by'),
                      ('Date Prepared', 'prepared'), ('Total Column 23', 'total'), ('Total Dual Eligible', 'dual')],
           'cols': [('Patient Name - Last', '1', 'last'), ('Patient Name - First', '2', 'first'),
                    ('Date of Service: From', '3', 'from'), ('Date of Service: To', '4', 'to'),
                    ('Patient Account Number', '5', 'acct'), ('MBI or HICN', '6', 'mbi'),
                    ('Medicaid Number', '7', 'medicaid'), ('Deemed Indigent', '8', 'indigent'),
                    ('Medicare Remittance Advice Date', '9', 'ra'), ('Medicaid Remittance Advice Date', '10', 'mcaid_ra'),
                    ('Secondary Payer RA Received Date', '11', 'sec_ra'),
                    ('Beneficiary Responsibility Amount', '12', 'bene_resp'),
                    ('Date First Bill Sent to Bene', '13', 'first_bill'), ('A/R Write Off Date', '14', 'ar_wo'),
                    ('Sent to Collection Agency (Y/N)', '15a', 'agency'),
                    ('Return from Collection Agency Date', '15', 'agency_ret'),
                    ('Collection Effort Ceased Date', '16', 'ceased'), ('Medicare Write Off Date', '17', 'mcr_wo'),
                    ('Recoveries Only: Amount Received', '18', 'recovery'),
                    ('Recoveries Only: MCR FYE Date', '19', 'recovery_fye'),
                    ('Medicare Deductible Amount', '20', 'deductible'), ('Medicare Coinsurance Amount', '21', 'coinsurance'),
                    ('Payments Received Prior to Write-Off', '22', 'paid_prior'),
                    ('Allowable Bad Debts Amount', '23', 'allowable'), ('Comments', '24', 'comments')]},
    '3B': {'id': 'Charity Care Charges', 'labels_row': 13,
           'header': [('Provider Name', 'name'), ('Provider Number (CCN)', 'ccn'), ('Component CCN', 'component'),
                      ('FYB', 'fyb'), ('FYE', 'fye'), ('Prepared By', 'by'), ('Date Prepared', 'prepared'),
                      ('Uninsured Column 20', 'total_uninsured'), ('Insured Column 20', 'total_insured')],
           'cols': [('Patient Name - Last', '1', 'last'), ('Patient Name - First', '2', 'first'),
                    ('Date of Service - From', '3', 'from'), ('Date of Service - To', '4', 'to'),
                    ('Patient Account Number', '5', 'acct'), ('Insurance Status', '6', 'status'),
                    ('Primary Payor', '7', 'primary'), ('Secondary Payor', '8', 'secondary'),
                    ('Total Charges for Claim', '9', 'charges'), ('Physician / Professional Charges', '10', 'phys'),
                    ('Deductible / Coinsurance / Copay Amounts', '11', 'ded_coins'),
                    ('Total Third Party Payments', '12', 'third_party'),
                    ('Insured Contractual Allowance Amount', '13', 'contractual'),
                    ('Other Non-Allowable Amounts', '14', 'other_nonallow'),
                    ('Total Patient Payments', '15', 'patient_paid'),
                    ('Amounts Written Off as Bad Debt', '16', 'bad_debt'),
                    ('Uninsured Discount Amounts', '17', 'uninsured_disc'),
                    ('Charity Care Non-Covered Charges', '18', 'noncovered'),
                    ('Other Charity Care Charges', '19', 'other_charity'),
                    ('Amounts Written Off to Charity Care and Uninsured Discounts', '20', 'charity_total'),
                    ('Write Off Date', '21', 'wo')]},
    '3C': {'id': 'Total Bad Debt', 'labels_row': 12,
           'header': [('Provider Name', 'name'), ('Provider Number (CCN)', 'ccn'), ('Component CCN', 'component'),
                      ('FYB', 'fyb'), ('FYE', 'fye'), ('Prepared By', 'by'), ('Date Prepared', 'prepared'),
                      ('Total Column 17', 'total')],
           'cols': [('Patient Last Name', '1', 'last'), ('Patient First Name', '2', 'first'),
                    ('Date of Service - From', '3', 'from'), ('Date of Service - To', '4', 'to'),
                    ('Patient Acct. Number', '5', 'acct'), ('Insurance Status', '6', 'status'),
                    ('Primary Payor', '7', 'primary'), ('Secondary Payor', '8', 'secondary'),
                    ('Service Indicator', '9', 'ipop'), ('Total Charges', '10', 'charges'),
                    ('Total Physician / Professional Charges', '11', 'phys'),
                    ('Total Patient Payments', '12', 'patient_paid'), ('Total Third Party Payments', '13', 'third_party'),
                    ('Patient Charity Care Amount', '14', 'charity'),
                    ('Contractual Allowance / Other Amount', '15', 'contractual'), ('A/R Write Off Date', '16', 'wo'),
                    ('Patient Bad Debt Write Off Amount', '17', 'bad_debt')]},
}


def cell_text(v):
    if v is None:
        return ''
    if isinstance(v, dt.date):
        return v.strftime('%m/%d/%Y')
    if isinstance(v, float):
        return f'{v:.2f}'
    return str(v)


def grid(ex, header, rows):
    """{(row, col): value} in the CMS template layout."""
    lay = LAYOUT[ex]
    g = {(1, 1): 'Supporting Exhibit', (1, 2): lay['id']}
    for i, (label, key) in enumerate(lay['header']):
        g[(3 + i, 1)] = label
        if header.get(key) not in (None, ''):
            g[(3 + i, 2)] = header[key]
    lr = lay['labels_row']
    for c, (label, num, _) in enumerate(lay['cols'], 1):
        g[(lr, c)] = label
        g[(lr + 1, c)] = num
    for r, row in enumerate(rows, lr + 2):
        for c, (_, _, key) in enumerate(lay['cols'], 1):
            if row.get(key) not in (None, ''):
                g[(r, c)] = row[key]
    return g


def to_csv(g):
    maxr = max(r for r, _ in g)
    maxc = max(c for _, c in g)
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator='\r\n')
    for r in range(1, maxr + 1):
        w.writerow([cell_text(g.get((r, c))) for c in range(1, maxc + 1)])
    return buf.getvalue().encode('utf-8')


def col_letters(n):
    s = ''
    while n:
        n, rem = divmod(n - 1, 26)
        s = chr(65 + rem) + s
    return s


def esc(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')


def to_xlsx(g, sheet='Exhibit'):
    """A minimal .xlsx: inline strings, numbers as numbers, dates as MM/DD/YYYY text (the specs allow either)."""
    rows = {}
    for (r, c), v in g.items():
        rows.setdefault(r, []).append((c, v))
    xr = []
    for r in sorted(rows):
        cells = []
        for c, v in sorted(rows[r]):
            ref = f'{col_letters(c)}{r}'
            if isinstance(v, float) or (isinstance(v, int) and not isinstance(v, bool)):
                cells.append(f'<c r="{ref}"><v>{v}</v></c>')
            else:
                cells.append(f'<c r="{ref}" t="inlineStr"><is><t>{esc(cell_text(v))}</t></is></c>')
        xr.append(f'<row r="{r}">{"".join(cells)}</row>')
    sheet_xml = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.'
                 'openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + ''.join(xr) + '</sheetData></worksheet>')
    files = {
        '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.'
        'openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.'
        'openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.'
        'spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.'
        'openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
        '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.'
        'openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.'
        'org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
        'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.'
        'openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/'
        f'relationships"><sheets><sheet name="{esc(sheet)}" sheetId="1" r:id="rId1"/></sheets></workbook>',
        'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns='
        '"http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.'
        'openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
        '</Relationships>',
        'xl/worksheets/sheet1.xml': sheet_xml,
    }
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
        for n, s in files.items():
            zi = zipfile.ZipInfo(n, date_time=(2025, 1, 15, 0, 0, 0))
            zi.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(zi, s)
    return buf.getvalue()


def package(files):
    """A .zip package with fixed timestamps, so the bytes (and the demo hashes) are reproducible."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
        for n, b in files:
            zi = zipfile.ZipInfo(n, date_time=(2025, 1, 15, 0, 0, 0))
            zi.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(zi, b)
    return buf.getvalue()


def listings_for(fx, *, seed=7, ccn=None, name='SAMPLE HOSPITAL'):
    """Listing rows (invented, de-identified) that add up to what the cost report claims."""
    rng = random.Random(seed)
    v = amounts(fx)
    rpt = fx['rpt']
    start, end = mdy(rpt[5]), mdy(rpt[6])
    ccn = ccn or rpt[2]
    g = lambda wk, ln, col='00100': v.get((wk, ln, col), 0.0)
    head = {'name': name, 'ccn': ccn, 'fyb': start, 'fye': end, 'by': 'REIMBURSEMENT DEPT', 'prepared': end + dt.timedelta(days=60)}
    out = {}
    ip_total = g('E00A18A', '06400') or g('E30A185', '02500')
    ip = rows_2a(ip_total, min(g('E00A18A', '06600'), ip_total), start, end, rng, 'M')
    op = rows_2a(g('E00A18B', '03400'), min(g('E00A18B', '03600'), g('E00A18B', '03400')), start, end, rng, 'N')
    if ip:
        out['2A-IP'] = ('2A', dict(head, ipop='IP', total=round(sum(r['allowable'] for r in ip), 2),
                                   dual=round(sum(r['allowable'] for r in ip if r['medicaid']), 2)), ip)
    if op:
        out['2A-OP'] = ('2A', dict(head, ipop='OP', total=round(sum(r['allowable'] for r in op), 2),
                                   dual=round(sum(r['allowable'] for r in op if r['medicaid']), 2)), op)
    comp = component_ccn(fx, ccn)
    p2 = ('S100002' in {k[0] for k in v})
    for key, ex, make, parts in (
            ('3B', '3B', lambda a, b: rows_3b(a, b, start, end, rng),
             [('20', '00100'), ('20', '00200')]),
            ('3C', '3C', lambda a, b: rows_3c(a, start, end, rng), [('26', '00100'), ('26', '00100')])):
        whole = [g('S100001', f'{int(ln):03d}00', col) for ln, col in parts]
        hosp = [g('S100002', f'{int(ln):03d}00', col) for ln, col in parts] if p2 else whole
        hosp = [min(h, w) for h, w in zip(hosp, whole)]
        rest = [round(w - h, 2) for w, h in zip(whole, hosp)]
        for suffix, amts, component in (('', hosp, ''), ('-COMP', rest, comp)):
            if ex == '3C':
                amts = [amts[0], 0.0]
            if sum(amts) <= 0:
                continue
            rows = make(*amts)
            for r in rows:
                r['acct'] = (component[-2:] if component else '') + r['acct']
            h = dict(head, component=component)
            if ex == '3B':
                h.update(total_uninsured=round(sum(r['charity_total'] for r in rows if r['status'] in '12'), 2),
                         total_insured=round(sum(r['charity_total'] for r in rows if r['status'] in '34'), 2))
            else:
                h.update(total=round(sum(r['bad_debt'] for r in rows), 2))
            out[key + suffix] = (ex, h, rows)
    return out


FILE_NAMES = {'2A-IP': 'MedicareBD_IP', '2A-OP': 'MedicareBD_OP', '3B': 'Charity', '3C': 'TotalBD',
              '3B-COMP': 'Charity_component', '3C-COMP': 'TotalBD_component'}


def component_ccn(fx, ccn):
    for wk, ln, col, x in fx['alpha']:
        if wk == 'S200001' and col == '00200' and '00400' <= ln <= '01900' and len(x) == 6 and x != ccn:
            return x
    return ccn[:2] + 'T' + ccn[3:]


def build_package(fx, listings, *, ecr=None, fmt='xlsx', ccn=None, leave_out=(), extra=()):
    rpt = fx['rpt']
    ccn = ccn or rpt[2]
    yy = rpt[6][-2:]
    files = [(f'EC{ccn}.{yy}A1', ecr if ecr is not None else ecr_from_hcris(fx, ccn=ccn))]
    for key, (ex, head, rows) in listings.items():
        if key in leave_out:
            continue
        g = grid(ex, head, rows)
        files.append((f'{FILE_NAMES[key]}_{ccn}.{fmt}', to_xlsx(g) if fmt == 'xlsx' else to_csv(g)))
    files.extend(extra)
    return package(files)
