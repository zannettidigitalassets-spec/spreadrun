"""Fill the official DOL Form WH-347 (Rev. January 2025) from a validated payroll.

The blank form (wh347-rev-2025-01.pdf, a U.S. government work published by DOL's Wage and Hour Division) is used as
is; payroll values are drawn on top of it. Page 1 is repeated for every 8 payroll rows, as the form instructions allow.
Page 2 gets its header, the apprenticeship program names and classifications, and each worker's total hourly fringe
credit. The Statement of Compliance check boxes, the certifying official, the signature, date, telephone and email are
always left blank: only the contractor can certify. Nothing here is stored or logged.
"""
import datetime as dt
import io
from decimal import Decimal, InvalidOperation
from pathlib import Path

TEMPLATE = Path(__file__).with_name('wh347-rev-2025-01.pdf')
PAGE_H = 612.0
ROWS_PER_PAGE = 8

# Helvetica advance widths (1/1000 em) for ASCII 32 to 126, from the standard AFM.
_W = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556,
      556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833,
      722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556,
      556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334,
      260, 334, 584]

# Page 1 geometry in PDF points, measured from the official form (x from the left, "top" from the top of the page).
P1_HEADER = {  # field: (x0, x1, top, bottom)
    'project_name': (40.3, 194.9, 132.4, 151.3),
    'project_no': (194.9, 340.7, 132.4, 151.3),
    'payroll_no': (340.7, 438.8, 132.4, 151.3),
    'contractor_name': (438.8, 751.3, 132.4, 151.3),
    'project_location': (40.3, 194.9, 163.8, 183.6),
    'wage_determination_no': (194.9, 340.7, 163.8, 183.6),
    'week_ending': (340.7, 438.8, 163.8, 183.6),
    'contractor_address': (438.8, 751.3, 163.8, 183.6),
}
P1_BOXES = {'final': (40.4, 101.4), 'prime': (432.0, 101.4), 'sub': (576.0, 101.4)}
DAY_X = [341.2, 355.3, 367.6, 379.9, 392.3, 404.6, 417.0, 430.2]
DAY_LETTER_ROW, DAY_DATE_ROW = (221.9, 235.8), (235.8, 249.8)
BLOCKS = [(282.2, 309.2), (310.7, 337.2), (338.6, 365.2), (366.6, 394.1), (395.5, 423.0), (424.4, 451.9),
          (451.9, 479.8), (479.8, 507.7)]
COLS = {  # column: (x0, x1, align)
    'entry_no': (40.3, 65.6, 'c'), 'last_name': (65.6, 115.7, 'l'), 'first_name': (115.7, 165.4, 'l'),
    'middle_initial': (165.4, 191.0, 'c'), 'worker_id': (191.0, 221.0, 'c'), 'worker_type': (221.0, 256.0, 'c'),
    'classification': (256.0, 300.4, 'l'), 'total_hours': (430.2, 457.0, 'c'), 'rate': (469.3, 497.9, 'r'),
    'fringe_credit': (497.9, 524.2, 'r'), 'cash_in_lieu': (524.2, 550.6, 'r'), 'gross_project': (550.6, 577.0, 'r'),
    'gross_all_work': (577.0, 604.4, 'r'), 'tax_withholding': (604.4, 631.3, 'r'), 'fica': (631.3, 658.2, 'r'),
    'other_deductions': (658.2, 689.2, 'r'), 'total_deductions': (689.2, 712.6, 'r'), 'net_pay': (712.6, 751.3, 'r'),
}
# Page 2
P2_HEADER = {
    'project_name': (30.7, 237.8, 44.0, 62.9), 'project_no': (237.8, 377.3, 44.0, 62.9),
    'payroll_no': (377.3, 471.8, 44.0, 62.9), 'contractor_name': (471.8, 759.8, 44.0, 62.9),
    'project_location': (30.7, 377.3, 75.4, 95.2), 'week_ending': (377.3, 471.8, 75.4, 95.2),
}
P2_PROGRAM_ROWS = [(237.6, 250.2), (250.2, 261.7), (261.7, 273.3)]
P2_PROGRAM_COLS = {'program': (53.8, 377.8), 'classification': (472.3, 759.8)}
P2_FRINGE_ROWS = [(371.4, 383.4), (383.4, 394.9), (394.9, 406.3), (406.3, 417.8), (417.8, 429.4), (429.4, 440.8),
                  (440.8, 452.3), (452.3, 463.8)]
P2_FRINGE_COLS = {'name': (53.8, 143.5), 'total': (716.0, 759.8)}


def _clean(s):
    s = ' '.join(str(s or '').split())
    return ''.join(ch if 32 <= ord(ch) < 127 else '?' for ch in s)


def _width(s, size):
    return sum(_W[ord(c) - 32] for c in s) * size / 1000


def _esc(s):
    return s.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')


class Canvas:
    def __init__(self):
        self.ops = []

    def wrapped(self, s, x0, x1, top, bottom, size=7.0):
        """One line if it fits at 5.5 points or more, otherwise two lines split at a space."""
        s = _clean(s)
        avail = x1 - x0 - 3
        if _width(s, 5.5) <= avail or ' ' not in s:
            return self.text(s, x0, x1, top, bottom, size=size)
        words = s.split(' ')
        best = min(range(1, len(words)), key=lambda i: max(_width(' '.join(words[:i]), 1), _width(' '.join(words[i:]), 1)))
        a, b = ' '.join(words[:best]), ' '.join(words[best:])
        size = min(size, 6.0)
        while size > 4.5 and max(_width(a, size), _width(b, size)) > avail:
            size -= 0.25
        mid = (top + bottom) / 2
        self.text(a, x0, x1, mid - size - 0.8, mid - 0.4, size=size, min_size=size)
        self.text(b, x0, x1, mid + 0.4, mid + size + 0.8, size=size, min_size=size)

    def text(self, s, x0, x1, top, bottom, align='l', size=7.0, min_size=4.5, pad=1.5):
        s = _clean(s)
        if not s:
            return
        avail = x1 - x0 - 2 * pad
        while size > min_size and _width(s, size) > avail:
            size -= 0.25
        while s and _width(s, size) > avail:   # still too long at the smallest size: clip
            s = s[:-1]
        w = _width(s, size)
        x = x0 + pad if align == 'l' else (x1 - pad - w if align == 'r' else (x0 + x1 - w) / 2)
        y = PAGE_H - bottom + (bottom - top - size) / 2 + 0.22 * size
        self.ops.append(f'BT /SRHelv {size:.2f} Tf {x:.2f} {y:.2f} Td ({_esc(s)}) Tj ET')

    def mark(self, x, top):
        """An X in a 9-point check box whose glyph starts at (x, top)."""
        y0, y1 = PAGE_H - top - 9.5, PAGE_H - top - 1.5
        self.ops.append(f'0.6 w {x + 1.2:.2f} {y0:.2f} m {x + 8.2:.2f} {y1:.2f} l S '
                        f'{x + 1.2:.2f} {y1:.2f} m {x + 8.2:.2f} {y0:.2f} l S')

    def data(self):
        return ('q 0 0 0 rg 0 0 0 RG\n' + '\n'.join(self.ops) + '\nQ\n').encode('latin-1')


def num(v, places=None):
    s = str(v if v is not None else '').strip().replace(',', '').replace('$', '')
    if s == '':
        return ''
    try:
        d = Decimal(s)
    except InvalidOperation:
        return _clean(v)
    if places is not None:
        return f'{d:,.{places}f}'
    return f'{d.normalize():f}'


def fill(data):
    """data: the output of engine.form_data(). Returns the filled PDF as bytes."""
    from pypdf import PdfReader, PdfWriter
    from pypdf.generic import ArrayObject, DecodedStreamObject, DictionaryObject, NameObject

    template = TEMPLATE.read_bytes()
    reader = PdfReader(io.BytesIO(template))
    writer = PdfWriter()
    font = DictionaryObject({NameObject('/Type'): NameObject('/Font'), NameObject('/Subtype'): NameObject('/Type1'),
                             NameObject('/BaseFont'): NameObject('/Helvetica'),
                             NameObject('/Encoding'): NameObject('/WinAnsiEncoding')})
    font_ref = writer._add_object(font)

    def add(page_index, canvas):
        page = writer.add_page(reader.pages[page_index])
        before, after = DecodedStreamObject(), DecodedStreamObject()
        before.set_data(b'q\n')
        after.set_data(b'\nQ\n' + canvas.data())
        old = page['/Contents'].get_object() if '/Contents' in page else ArrayObject()
        old = list(old) if isinstance(old, ArrayObject) else [page['/Contents']]
        page[NameObject('/Contents')] = ArrayObject([writer._add_object(before), *old, writer._add_object(after)])
        res = page['/Resources'].get_object() if '/Resources' in page else DictionaryObject()
        res = DictionaryObject(res)                       # a copy for this page, so no other page changes
        fonts = DictionaryObject(res.get('/Font', DictionaryObject()).get_object() if '/Font' in res else {})
        fonts[NameObject('/SRHelv')] = font_ref
        res[NameObject('/Font')] = fonts
        page[NameObject('/Resources')] = res

    h = data['header']
    we = data['weekEnding']
    week_text = we.strftime('%m/%d/%Y') if we else h.get('week_ending', '')
    rows = data['rows'] or [{}]
    for start in range(0, len(rows), ROWS_PER_PAGE):
        c = Canvas()
        for key, (x0, x1, top, bottom) in P1_HEADER.items():
            c.text(week_text if key == 'week_ending' else h.get(key, ''), x0, x1, top, bottom, size=8, pad=4)
        if data.get('final'):
            c.mark(*P1_BOXES['final'])
        if data.get('role') in P1_BOXES:
            c.mark(*P1_BOXES[data['role']])
        if we:
            for i in range(7):
                d = we - dt.timedelta(days=6 - i)
                c.text('MTWTFSS'[d.weekday()], DAY_X[i], DAY_X[i + 1], *DAY_LETTER_ROW, align='c', size=6.5)
                c.text(f'{d.month}/{d.day}', DAY_X[i], DAY_X[i + 1], *DAY_DATE_ROW, align='c', size=5.5, min_size=4)
        for slot, r in enumerate(rows[start:start + ROWS_PER_PAGE]):
            top, bottom = BLOCKS[slot]
            mid = (top + bottom) / 2
            for key in ('entry_no', 'middle_initial', 'worker_id'):
                x0, x1, al = COLS[key]
                c.text(r.get(key, ''), x0, x1, top, bottom, align=al)
            for key in ('last_name', 'first_name', 'classification'):
                x0, x1, _ = COLS[key]
                c.wrapped(r.get(key, ''), x0, x1, top, bottom)
            x0, x1, al = COLS['worker_type']
            wt = str(r.get('worker_type', '')).strip().upper()
            lvl = str(r.get('apprentice_level', '')).strip()
            c.text(f'{wt} {lvl}'.strip() if wt == 'RA' else wt, x0, x1, top, bottom, align='c')
            for i in range(7):
                c.text(num(r.get(f'st_{i + 1}')), DAY_X[i], DAY_X[i + 1], top, mid, align='c', size=6.5)
                c.text(num(r.get(f'ot_{i + 1}')), DAY_X[i], DAY_X[i + 1], mid, bottom, align='c', size=6.5)
            x0, x1, al = COLS['total_hours']
            c.text(num(r.get('total_hours')), x0, x1, top, bottom, align=al)
            x0, x1, al = COLS['rate']
            c.text(num(r.get('st_rate'), 2), x0, x1, top, mid, align=al, size=6.5)
            c.text(num(r.get('ot_rate'), 2), x0, x1, mid, bottom, align=al, size=6.5)
            for key in ('fringe_credit', 'cash_in_lieu', 'gross_project', 'gross_all_work', 'tax_withholding', 'fica',
                        'other_deductions', 'total_deductions', 'net_pay'):
                x0, x1, al = COLS[key]
                c.text(num(r.get(key), 2), x0, x1, top, bottom, align=al, size=6.5)
        add(0, c)

    c = Canvas()
    for key, (x0, x1, top, bottom) in P2_HEADER.items():
        c.text(week_text if key == 'week_ending' else h.get(key, ''), x0, x1, top, bottom, size=8, pad=4)
    for (top, bottom), (program, cls) in zip(P2_PROGRAM_ROWS, data['programs']):
        c.text(program, *P2_PROGRAM_COLS['program'], top, bottom, size=6.5, pad=3)
        c.text(cls, *P2_PROGRAM_COLS['classification'], top, bottom, size=6.5, pad=3)
    for (top, bottom), (name, total) in zip(P2_FRINGE_ROWS, data['fringe']):
        c.text(name, *P2_FRINGE_COLS['name'], top, bottom, size=6, pad=3)
        c.text(num(total, 2), *P2_FRINGE_COLS['total'], top, bottom, align='r', size=6)
    add(1, c)

    extra_programs, extra_fringe = data['programs'][3:], data['fringe'][8:]
    if extra_programs or extra_fringe:
        # Addendum, as the form instructions ask when page 2 runs out of rows: a plain continuation page.
        add_addendum(writer, font_ref, h, week_text, extra_programs, extra_fringe)

    out = io.BytesIO()
    writer.add_metadata({'/Title': 'WH-347 Certified Payroll (filled by SpreadRun, not signed)',
                         '/Producer': 'SpreadRun WH-347 pre-check'})
    writer.write(out)
    return out.getvalue()


def add_addendum(writer, font_ref, h, week_text, programs, fringe):
    from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject
    lines = [('WH-347 addendum (continuation of page 2)', 10),
             (f"Project: {h.get('project_name', '')} | Payroll no.: {h.get('payroll_no', '')} | Week ending: {week_text}", 8),
             (f"Contractor: {h.get('contractor_name', '')}", 8), ('', 8)]
    if programs:
        lines.append(('Apprenticeship programs (registered with OA or SAA: mark as applicable)', 9))
        lines += [(f'{p} | Labor classification: {cl}', 8) for p, cl in programs] + [('', 8)]
    if fringe:
        lines.append(('Hourly credit for fringe benefits (plan name, type, number and funded or unfunded to be completed '
                      'by the contractor)', 9))
        lines += [(f'{n} | Total hourly credit: ${num(t, 2)}', 8) for n, t in fringe]
    while lines:
        page = writer.add_blank_page(width=792, height=612)
        c = Canvas()
        top = 40.0
        while lines and top < 570:
            text, size = lines.pop(0)
            c.text(text, 40, 752, top, top + size + 4, size=size)
            top += size + 6
        s = DecodedStreamObject()
        s.set_data(c.data())
        page[NameObject('/Contents')] = writer._add_object(s)
        page[NameObject('/Resources')] = DictionaryObject(
            {NameObject('/Font'): DictionaryObject({NameObject('/SRHelv'): font_ref})})
