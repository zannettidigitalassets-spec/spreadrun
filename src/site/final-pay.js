// Final paycheck deadlines for all 50 states and DC, for the free tool at /tools/final-paycheck-deadline. Pure data and
// date math, no network, so scripts/tests/final-pay.test.mjs can check every rule.
//
// Every rule was read on October 6, 2026 in the state's own code or labor department publication (the URL in each
// row). Where a statute is ambiguous or silent on a case, the row uses the earliest date the text allows and says so
// in a flag, instead of guessing. Business days are counted Monday to Friday; holidays are not skipped, so a
// business-day date shown here is never later than the real deadline.

// Separation types. "laidoff" is separate because several states treat a layoff differently from a discharge.
export const TYPES = [
  { id: 'fired', label: 'Fired (discharged by the employer)' },
  { id: 'laidoff', label: 'Laid off' },
  { id: 'quitNotice', label: 'Quit with at least 72 hours notice' },
  { id: 'quitNoNotice', label: 'Quit without notice (or less than 72 hours)' },
];

// Rule shapes:
//   { k: 'now' }                       due on the separation date
//   { k: 'hours', n }                  within n hours of separation
//   { k: 'days', n }                   n calendar days after separation
//   { k: 'bdays', n }                  n business days after separation (Mon to Fri)
//   { k: 'payday' }                    the next regular payday
//   { k: 'periodEnd' }                 the end of the current pay period
//   { k: 'earlier', of: [rule, rule] } whichever comes first
//   { k: 'later', of: [rule, rule] }   whichever comes last
//   { k: 'demand' }                    due when the employee asks in writing (Minnesota discharge)
//   { k: 'mnQuit' }                    Minnesota's first-payday rule with its 5-day and 20-day limits
//   { k: 'none' }                      no state statute sets a deadline
const now = { k: 'now' };
const payday = { k: 'payday' };
const none = { k: 'none' };
const hours = (n) => ({ k: 'hours', n });
const days = (n) => ({ k: 'days', n });
const bdays = (n) => ({ k: 'bdays', n });
const earlier = (...of) => ({ k: 'earlier', of });
const later = (...of) => ({ k: 'later', of });
const all = (r) => ({ fired: r, laidoff: r, quitNotice: r, quitNoNotice: r });

const FED = ['U.S. Department of Labor: Last Paycheck', 'https://www.dol.gov/general/topic/wages/lastpaycheck'];

export const STATES = [
  { code: 'AL', name: 'Alabama', ...all(none),
    note: 'We found no Alabama statute that sets a deadline for a final paycheck. Federal law does not require immediate payment either. The safe practice is the next regular payday.',
    penalty: 'No state penalty statute for late final pay found.',
    sources: [FED] },
  { code: 'AK', name: 'Alaska', fired: bdays(3), laidoff: bdays(3), quitNotice: payday, quitNoNotice: payday,
    note: 'When the employer ends the job, for any reason, pay is due within three working days. When the employee quits, pay is due on the next regular payday that is at least three days after the employer got notice of the quit.',
    penalty: 'Up to the employee\'s regular pay from the time they demand payment until paid, for at most 90 working days (AS 23.05.140(d)).',
    sources: [['Alaska Stat. 23.05.140', 'https://www.akleg.gov/basis/statutes.asp#23.05.140']] },
  { code: 'AZ', name: 'Arizona', fired: earlier(bdays(7), { k: 'periodEnd' }), laidoff: earlier(bdays(7), { k: 'periodEnd' }), quitNotice: payday, quitNoNotice: payday,
    flags: { laidoff: 'The statute says "discharged" and does not mention layoffs, so this uses the discharge deadline, which is the earlier one.' },
    note: 'A discharged employee is paid within seven working days or by the end of the next regular pay period, whichever is sooner. An employee who quits is paid by the regular payday for the pay period in which they quit, by mail if they ask.',
    penalty: 'The employee can sue for treble the unpaid wages (A.R.S. 23-355). A violation is also a petty offense (23-353(D)).',
    sources: [['A.R.S. 23-353', 'https://www.azleg.gov/ars/23/00353.htm'], ['A.R.S. 23-355', 'https://www.azleg.gov/ars/23/00355.htm']] },
  { code: 'AR', name: 'Arkansas', fired: payday, laidoff: payday, quitNotice: none, quitNoNotice: none,
    flags: { laidoff: 'The statute covers an employer that "discharges" an employee. A layoff is treated the same way here.' },
    note: 'A discharged employee must be paid all wages due by the next regular payday. Arkansas has no statute for employees who quit; the next regular payday is the safe practice.',
    penalty: 'Double the wages due if the employer has not paid within seven days of the next regular payday (Ark. Code 11-4-405, as amended by Act 853 of 2019).',
    sources: [['Ark. Code 11-4-405 (Act 853 of 2019)', 'https://www.arkleg.state.ar.us/Home/FTPDocument?path=%2FACTS%2F2019R%2FPublic%2FACT853.pdf']] },
  { code: 'CA', name: 'California', fired: now, laidoff: now, quitNotice: now, quitNoNotice: hours(72),
    note: 'Wages are due immediately on discharge or layoff. An employee who quits with at least 72 hours notice is paid at the time of quitting; without that notice, within 72 hours. Seasonal layoffs in fruit, fish and vegetable processing get up to 72 hours. The quit rule covers employees without a written contract for a definite period.',
    penalty: 'Waiting-time penalty: a day\'s wages for each day the pay is late, up to 30 days, if the failure is willful (Lab. Code 203).',
    daily: 'A day\'s wages per day late', cap: '30 days',
    wages: 'Vested vacation must be paid out at the final rate, and a policy cannot take it away at termination (Lab. Code 227.3).',
    sources: [['Cal. Lab. Code 201', 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=LAB&sectionNum=201.'], ['Cal. Lab. Code 202', 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=LAB&sectionNum=202.'], ['Cal. Lab. Code 203', 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=LAB&sectionNum=203.'], ['Cal. Lab. Code 227.3', 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=LAB&sectionNum=227.3']] },
  { code: 'CO', name: 'Colorado', fired: now, laidoff: now, quitNotice: payday, quitNoNotice: payday,
    note: 'When the employer ends the job, wages are due immediately. If the payroll office is not open, pay is due within 6 hours of its next workday starting, or 24 hours if the payroll office is off site. An employee who quits is paid on the next regular payday.',
    penalty: 'If not paid within 14 days of a written demand: a penalty of the greater of 2 times the wages or $1,000, or 3 times or $3,000 if willful (C.R.S. 8-4-109; CDLE INFO #2B).',
    sources: [['C.R.S. 8-4-109 (Colorado Revised Statutes 2024, Title 8)', 'https://content.leg.colorado.gov/sites/default/files/images/olls/crs2024-title-08.pdf'], ['CDLE INFO #2B: Orders of Wages, Penalties, Fines (August 2025)', 'https://cdle.colorado.gov/sites/cdle/files/info_%232b_orders_of_wages%2C_penalties%2C_fines%2C_and_consequences_for_non-compliance_08.11.25.pdf']] },
  { code: 'CT', name: 'Connecticut', fired: bdays(1), laidoff: payday, quitNotice: payday, quitNoNotice: payday,
    note: 'A discharged employee is paid by the next business day. A laid-off employee or one who quits is paid by the next regular payday.',
    penalty: 'Twice the wages plus costs and attorney fees in a civil action; only the wages if the employer shows a good-faith belief it was complying (Conn. Gen. Stat. 31-72).',
    wages: 'Accrued vacation is owed at termination only if a policy or union contract provides for payout (31-76k).',
    sources: [['Conn. Gen. Stat. 31-71c, 31-72, 31-76k', 'https://www.cga.ct.gov/current/pub/chap_558.htm']] },
  { code: 'DE', name: 'Delaware', ...all(later(payday, bdays(3))),
    note: 'For every kind of separation, wages are due on the later of the next regular payday or three business days after the last day worked.',
    penalty: '10% of unpaid wages for each day late (except Sundays and legal holidays), capped at the unpaid wages, unless there were reasonable grounds for a dispute (19 Del. C. 1103(b)).',
    daily: '10% of unpaid wages per day', cap: 'The amount of the unpaid wages',
    sources: [['19 Del. C. 1103', 'https://delcode.delaware.gov/title19/c011/index.html']] },
  { code: 'DC', name: 'District of Columbia', fired: bdays(1), laidoff: bdays(1), quitNotice: earlier(payday, days(7)), quitNoNotice: earlier(payday, days(7)),
    flags: { laidoff: 'The D.C. law covers discharges and quits; a layoff is treated as a discharge here, the earlier deadline.' },
    note: 'A discharged employee is paid by the next working day (4 days for an employee who handled the employer\'s money). An employee who quits is paid by the next regular payday or within 7 days, whichever is earlier. A union contract can set different terms.',
    penalty: '10% of unpaid wages for each working day late, capped at treble the unpaid wages (D.C. Code 32-1303(4)).',
    daily: '10% of unpaid wages per working day', cap: 'Treble the unpaid wages',
    sources: [['D.C. Code 32-1303', 'https://code.dccouncil.gov/us/dc/council/code/sections/32-1303']] },
  { code: 'FL', name: 'Florida', ...all(none),
    note: 'Florida\'s labor chapter has no section on final pay. Federal law does not require immediate payment either. The safe practice is the next regular payday.',
    penalty: 'No state penalty statute for late final pay; a court can award attorney fees in a successful unpaid-wage suit (Fla. Stat. 448.08).',
    sources: [['Fla. Stat. ch. 448, Part I (contents)', 'https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0400-0499/0448/0448PARTIContentsIndex.html'], FED] },
  { code: 'GA', name: 'Georgia', ...all(none),
    note: 'We found no Georgia statute that sets a deadline for a final paycheck; the Georgia Department of Labor points unpaid-wage claims to the federal Wage and Hour Division or magistrate court. The safe practice is the next regular payday.',
    penalty: 'No state penalty statute for late final pay found.',
    sources: [['Georgia Department of Labor: Laws and Regulations FAQ', 'https://dol.georgia.gov/faqs-individuals/individuals-faqs-laws-and-regulations'], FED] },
  { code: 'HI', name: 'Hawaii', fired: now, laidoff: payday, quitNotice: now, quitNoNotice: payday, onePeriodNotice: true,
    flags: { laidoff: 'The statute gives the next regular payday for a temporary layoff. A permanent layoff may count as a discharge, which is due at once; if the layoff is permanent, pay on the last day to be safe.' },
    note: 'A discharged employee is paid at the time of discharge, or by the next working day if immediate payment is impossible. An employee who quits is paid by the next regular payday, or at the time of quitting if they gave at least one pay period\'s notice.',
    penalty: 'The unpaid wages plus an equal amount plus 6% interest, and a penalty of the greater of $500 or $100 per violation, if the failure has no equitable justification (HRS 388-10).',
    wages: 'Hawaii\'s official code notes record a court holding that unused vacation paid at separation was not "wages" under this law; follow your written policy.',
    sources: [['HRS 388-3', 'https://data.capitol.hawaii.gov/hrscurrent/Vol07_Ch0346-0398/HRS0388/HRS_0388-0003.htm'], ['HRS 388-10', 'https://data.capitol.hawaii.gov/hrscurrent/Vol07_Ch0346-0398/HRS0388/HRS_0388-0010.htm']] },
  { code: 'ID', name: 'Idaho', ...all(earlier(payday, bdays(10))),
    note: 'For every kind of separation, wages are due by the earlier of the next regular payday or 10 days, weekends and holidays excluded. If the employee asks in writing, within 48 hours of the request, weekends and holidays excluded.',
    penalty: 'Wages continue at the same rate for up to 15 days, capped at $750 ($500 if paid before a wage lien is filed) (Idaho Code 45-607).',
    daily: 'A day\'s wages per day late', cap: '15 days, $750 maximum',
    sources: [['Idaho Code 45-606', 'https://legislature.idaho.gov/statutesrules/idstat/Title45/T45CH6/SECT45-606/'], ['Idaho Code 45-607', 'https://legislature.idaho.gov/statutesrules/idstat/Title45/T45CH6/SECT45-607/']] },
  { code: 'IL', name: 'Illinois', ...all(payday),
    note: 'Final compensation is due at the time of separation if possible, and in no case later than the next regularly scheduled payday. The employee can ask in writing for a mailed check.',
    penalty: '5% of the underpayment for each month it stays unpaid, plus costs and attorney fees in a civil action (820 ILCS 115/14).',
    wages: 'Earned vacation under a policy or contract must be paid out at the final rate, and a policy cannot make it forfeit at separation (820 ILCS 115/5).',
    sources: [['820 ILCS 115/5', 'https://ilga.gov/legislation/ilcs/documents/082001150K5.htm'], ['820 ILCS 115/14', 'https://ilga.gov/legislation/ilcs/documents/082001150K14.htm']] },
  { code: 'IN', name: 'Indiana', ...all(payday),
    note: 'When the employer separates an employee, wages are due at the regular payday for the pay period in which the separation occurred. An employee who leaves voluntarily is paid on the next usual payday. Railroads are excluded from the separation rule.',
    penalty: 'If a court finds the employer did not act in good faith, liquidated damages of two times the wages due, plus attorney fees and costs (IC 22-2-5-2).',
    sources: [['Indiana Code Title 22, Article 2 (22-2-5-1, 22-2-5-2, 22-2-9-2)', 'https://iga.in.gov/laws/2025/ic/titles/22#22-2-9-2']] },
  { code: 'IA', name: 'Iowa', ...all(payday),
    note: 'When employment ends or is suspended, wages are due by the next regular payday for the pay period in which they were earned. Commission differences are due within 30 days.',
    penalty: 'If the failure was intentional: liquidated damages of 5% of the unpaid wages per day (not counting Sundays, holidays and the first 7 days), capped at the unpaid wages (Iowa Code 91A.2, 91A.8).',
    daily: '5% of unpaid wages per day (intentional failures)', cap: 'The amount of the unpaid wages',
    wages: 'Vacation due under an agreement or policy with pro rata accrual counts in proportion to the part of the year worked (91A.4).',
    sources: [['Iowa Code 91A.4', 'https://www.legis.iowa.gov/docs/code/91A.4.pdf'], ['Iowa Code 91A.8', 'https://www.legis.iowa.gov/docs/code/91A.8.pdf'], ['Iowa Code 91A.2', 'https://www.legis.iowa.gov/docs/code/91A.2.pdf']] },
  { code: 'KS', name: 'Kansas', ...all(payday),
    note: 'Whether the employee is discharged or quits, wages are due by the next regular payday on which they would have been paid, by mail if requested.',
    penalty: 'If willful: 1% of unpaid wages per day (except Sundays and holidays) starting after the eighth day, capped at 100% of the unpaid wages (K.S.A. 44-315(b)).',
    daily: '1% of unpaid wages per day (willful failures)', cap: '100% of the unpaid wages',
    sources: [['K.S.A. 44-315', 'https://ksrevisor.gov/statutes/chapters/ch44/044_003_0015.html']] },
  { code: 'KY', name: 'Kentucky', ...all(later(payday, days(14))),
    note: 'Wages are due by the next normal pay period or 14 days after separation, whichever comes last.',
    penalty: 'Liquidated damages equal to the unpaid wages, plus costs and fees; a court can reduce them for good faith (KRS 337.385).',
    sources: [['KRS 337.055', 'https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=32050'], ['KRS 337.385', 'https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=55338']] },
  { code: 'LA', name: 'Louisiana', ...all(earlier(payday, days(15))),
    note: 'On discharge or resignation, wages are due on the next regular payday or within 15 days, whichever is first. A union contract can provide otherwise.',
    penalty: 'The lesser of 90 days\' wages or full wages from the employee\'s demand until paid. If the dispute was in good faith, only the wages plus interest (La. R.S. 23:632).',
    daily: 'A day\'s wages per day after demand', cap: '90 days of wages',
    wages: 'Vacation pay is owed at separation only if the employer\'s stated policy makes it earned, and earned vacation cannot be forfeited (23:631(D)).',
    sources: [['La. R.S. 23:631', 'https://legis.la.gov/legis/Law.aspx?d=83946'], ['La. R.S. 23:632', 'https://legis.la.gov/legis/Law.aspx?d=155771']] },
  { code: 'ME', name: 'Maine', ...all(payday),
    note: 'An employee leaving employment must be paid in full no later than the next established payday.',
    penalty: 'Liquidated damages of twice the unpaid wages, plus interest and attorney fees; a fine of $100 to $500 per violation (26 M.R.S. 626-A).',
    wages: 'Unused vacation accrued on or after January 1, 2023 must be paid out, unless the employer has 10 or fewer employees or is a public employer (26 M.R.S. 626).',
    sources: [['26 M.R.S. 626', 'https://legislature.maine.gov/statutes/26/title26sec626.html'], ['26 M.R.S. 626-A', 'https://legislature.maine.gov/statutes/26/title26sec626-A.html']] },
  { code: 'MD', name: 'Maryland', ...all(payday),
    note: 'All wages are due on or before the day the employee would have been paid if the job had not ended.',
    penalty: 'Up to 3 times the wages plus attorney fees if the withholding was not a bona fide dispute; the employee can sue 2 weeks after the due date (Lab. & Empl. 3-507.2).',
    wages: 'Accrued leave must be paid out unless a written policy limits it, the employee was told about the policy at hiring, and the policy does not entitle them to it (Lab. & Empl. 3-505(b)).',
    sources: [['Md. Code, Lab. & Empl. 3-505', 'https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gle&section=3-505&enactments=false'], ['Md. Code, Lab. & Empl. 3-507.2', 'https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gle&section=3-507.2&enactments=false']] },
  { code: 'MA', name: 'Massachusetts', fired: now, laidoff: now, quitNotice: payday, quitNoNotice: payday,
    flags: { laidoff: 'The statute says "discharged" and does not mention layoffs, so this uses the discharge rule, the earlier one.' },
    note: 'A discharged employee is paid in full on the day of discharge. An employee who leaves is paid on the next regular payday, or the following Saturday if there is no regular payday.',
    penalty: 'Mandatory treble damages plus attorney fees, after filing a complaint with the Attorney General (M.G.L. c. 149, 150).',
    sources: [['M.G.L. c. 149, 148', 'https://malegislature.gov/Laws/GeneralLaws/PartI/TitleXXI/Chapter149/Section148'], ['M.G.L. c. 149, 150', 'https://malegislature.gov/Laws/GeneralLaws/PartI/TitleXXI/Chapter149/Section150']] },
  { code: 'MI', name: 'Michigan', ...all(now),
    flags: { all: 'The statute says "as soon as the amount can with due diligence be determined," not a fixed number of days. The date shown is the separation date, the safest reading.' },
    note: 'Wages are due as soon as the amount can be worked out with due diligence, whether the employee was discharged or left. Hand-harvest crop workers who quit are paid within 3 days.',
    penalty: 'A 10% annual penalty from when the employer is notified of a complaint; up to 2 times the wages if flagrant or repeated; a civil penalty up to $1,000 (MCL 408.488).',
    sources: [['MCL 408.475', 'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-408-475'], ['MCL 408.488', 'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-408-488']] },
  { code: 'MN', name: 'Minnesota', fired: { k: 'demand' }, laidoff: { k: 'demand' }, quitNotice: { k: 'mnQuit' }, quitNoNotice: { k: 'mnQuit' },
    flags: { laidoff: 'The statute says "discharges"; a layoff is treated as a discharge here.' },
    note: 'A discharged employee\'s wages are due immediately on written demand; the employer is in default 24 hours after the demand. An employee who quits is paid by the first regularly scheduled payday; if that payday is less than 5 days after the last day, the employer can wait until the second payday, but no more than 20 days after the last day.',
    penalty: 'After a written demand goes unpaid 24 hours: the employee\'s average daily earnings for each day in default, up to 15 days (Minn. Stat. 181.13, 181.14).',
    daily: 'Average daily earnings per day in default', cap: '15 days',
    sources: [['Minn. Stat. 181.13', 'https://www.revisor.mn.gov/statutes/cite/181.13'], ['Minn. Stat. 181.14', 'https://www.revisor.mn.gov/statutes/cite/181.14']] },
  { code: 'MS', name: 'Mississippi', ...all(none),
    note: 'We found no Mississippi statute that sets a deadline for a final paycheck. Federal law does not require immediate payment either. The safe practice is the next regular payday.',
    penalty: 'No state penalty statute for late final pay found.',
    sources: [FED] },
  { code: 'MO', name: 'Missouri', fired: now, laidoff: now, quitNotice: none, quitNoNotice: none,
    note: 'When an employer discharges an employee, with or without cause, or refuses to employ them further, wages are due on the day of discharge. The Missouri Department of Labor says no Missouri law sets when wages are due after a quit.',
    penalty: 'For discharges: wages continue at the same rate, up to 60 days, if the money does not arrive within 7 days of the employee\'s written request (RSMo 290.110).',
    daily: 'A day\'s wages per day (discharges, after a written request)', cap: '60 days',
    sources: [['RSMo 290.110', 'https://revisor.mo.gov/main/OneSection.aspx?section=290.110'], ['Missouri Department of Labor: final wages after a quit', 'https://labor.mo.gov/faqs/knowledge-base/if-employee-quits-his-job-when-are-final-wages-due-him']] },
  { code: 'MT', name: 'Montana', fired: now, laidoff: now, quitNotice: earlier(payday, days(15)), quitNoNotice: earlier(payday, days(15)),
    flags: { fired: 'Immediate applies to a separation for cause. With a written personnel policy, the employer can pay by the earlier of the next payday or 15 days. A discharge without cause falls under the general rule (next payday or 15 days, whichever first).', laidoff: 'Immediate unless a written personnel policy extends it to the earlier of the next payday or 15 days.' },
    note: 'A separation for cause or a layoff is paid immediately, unless a written personnel policy allows the earlier of the next payday or 15 days. Other separations, including quits, are paid by the next regular payday or within 15 days, whichever comes first.',
    penalty: 'A penalty of up to 110% of the wages due, and the violation is a misdemeanor (MCA 39-3-206).',
    sources: [['MCA 39-3-205', 'https://mca.legmt.gov/bills/mca/title_0390/chapter_0030/part_0020/section_0050/0390-0030-0020-0050.html'], ['MCA 39-3-206', 'https://mca.legmt.gov/bills/mca/title_0390/chapter_0030/part_0020/section_0060/0390-0030-0020-0060.html']] },
  { code: 'NE', name: 'Nebraska', ...all(earlier(payday, days(14))),
    flags: { quitNotice: 'The statute speaks of an employer that "separates an employee from the payroll" and has no separate quit rule, so the same deadline is shown for quits.', quitNoNotice: 'The statute speaks of an employer that "separates an employee from the payroll" and has no separate quit rule, so the same deadline is shown for quits.' },
    note: 'For a private employer, unpaid wages are due on the next regular payday or within two weeks of termination, whichever is sooner. Public employers follow a schedule tied to governing-body meetings.',
    penalty: 'In a suit, an amount equal to the judgment, or 2 times the unpaid wages if willful, paid to the state for the school fund rather than to the employee (Neb. Rev. Stat. 48-1232).',
    wages: 'Earned but unused vacation is part of the wages due at separation (Neb. Rev. Stat. 48-1229(6)).',
    sources: [['Neb. Rev. Stat. 48-1230', 'https://nebraskalegislature.gov/laws/statutes.php?statute=48-1230'], ['Neb. Rev. Stat. 48-1229', 'https://nebraskalegislature.gov/laws/statutes.php?statute=48-1229'], ['Neb. Rev. Stat. 48-1232', 'https://nebraskalegislature.gov/laws/statutes.php?statute=48-1232']] },
  { code: 'NV', name: 'Nevada', fired: now, laidoff: now, quitNotice: earlier(payday, days(7)), quitNoNotice: earlier(payday, days(7)),
    note: 'On discharge, or a temporary layoff with a possible recall, wages are due immediately. An employee who quits is paid by the regular payday or within 7 days, whichever is earlier.',
    penalty: 'Wages continue at the same rate until paid, up to 30 days. For discharges and layoffs it starts if pay is more than 3 days late; for quits, if it is late at all (NRS 608.040).',
    daily: 'A day\'s wages per day late', cap: '30 days',
    sources: [['NRS 608.020 to 608.050', 'https://www.leg.state.nv.us/NRS/NRS-608.html']] },
  { code: 'NH', name: 'New Hampshire', fired: hours(72), laidoff: payday, quitNotice: hours(72), quitNoNotice: payday, onePeriodNotice: true,
    note: 'A discharged employee is paid in full within 72 hours. A laid-off employee, or one who quits, is paid by the next regular payday; if the employee gave at least one pay period\'s notice of quitting, within 72 hours.',
    penalty: 'If willful and without good cause: 10% of the unpaid wages for each day late (except Sundays and holidays), capped at the unpaid wages (RSA 275:44, IV).',
    daily: '10% of unpaid wages per day (willful failures)', cap: 'The amount of the unpaid wages',
    sources: [['RSA 275:44', 'https://gc.nh.gov/rsa/html/XXIII/275/275-44.htm']] },
  { code: 'NJ', name: 'New Jersey', ...all(payday),
    note: 'For a discharge, layoff or quit, wages are due no later than the regular payday for the pay period in which the employment ended.',
    penalty: 'Liquidated damages of up to 200% of the wages owed (N.J.S.A. 34:11-4.10(c)).',
    wages: 'The New Jersey Department of Labor says vacation pay is not required by state law, but an employer that offers it must follow its own policy or agreement.',
    sources: [['N.J.S.A. 34:11-4.3 and 34:11-4.10 (NJDOL compilation of selected labor laws)', 'https://www.nj.gov/labor/forms_pdfs/lsse/MW-71.pdf'], ['NJDOL Wage and Hour FAQs for employers', 'https://www.nj.gov/labor/wageandhour/support/faqs/wageandhouremployerfaqs.shtml']] },
  { code: 'NM', name: 'New Mexico', fired: days(5), laidoff: days(5), quitNotice: payday, quitNoNotice: payday,
    flags: { fired: 'Five days applies to a fixed and definite wage, on the employee\'s demand. For task, piece, commission or other calculated pay, the limit is 10 days.', laidoff: 'The statute covers discharges; a layoff is treated as a discharge here. Five days applies to fixed wages; 10 days for task, piece or commission pay.' },
    note: 'A discharged employee with a fixed, definite wage is paid within 5 days (due on demand); other pay within 10 days. An employee who quits is paid on the next payday (for employees without a written contract for a definite period).',
    penalty: 'For discharges: wages continue at the same rate from the discharge until paid, up to 60 days, if the employee made a demand (NMSA 50-4-4(C)).',
    daily: 'A day\'s wages per day (discharges, after demand)', cap: '60 days',
    sources: [['NMSA 1978, Chapter 50 (50-4-4, 50-4-5)', 'https://nmonesource.com/nmos/nmsa/en/item/4420/index.do']] },
  { code: 'NY', name: 'New York', ...all(payday),
    note: 'If employment is terminated, wages are due by the regular payday for the pay period in which it ended, by mail if the employee asks.',
    penalty: 'Liquidated damages equal to 100% of the unpaid wages, plus interest and attorney fees, unless the employer proves good faith (N.Y. Labor Law 198(1-a)).',
    sources: [['N.Y. Labor Law 191', 'https://www.nysenate.gov/legislation/laws/LAB/191'], ['N.Y. Labor Law 198', 'https://www.nysenate.gov/legislation/laws/LAB/198']] },
  { code: 'NC', name: 'North Carolina', ...all(payday),
    note: 'Employees whose employment ends for any reason are paid on or before the next regular payday. Bonuses and commissions are due on the first payday after the amount can be calculated.',
    penalty: 'Liquidated damages equal to the amount due, plus interest; a court may reduce them for good faith (G.S. 95-25.22).',
    wages: 'Earned pay such as vacation can be forfeited only if the employee was told about the forfeiture policy in advance (G.S. 95-25.7, 95-25.13).',
    sources: [['N.C.G.S. 95-25.7', 'https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_95/GS_95-25.7.html'], ['N.C.G.S. 95-25.22', 'https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_95/GS_95-25.22.html']] },
  { code: 'ND', name: 'North Dakota', ...all(payday),
    note: 'Wages are due at the regular paydays the employer set in advance for the periods worked. When the employer discharges or terminates an employee, the pay goes by certified mail to an address the employee designates, unless both agree otherwise.',
    penalty: 'Wages continue at the contract rate for each day in default, up to 30 days (NDCC 34-14-03); double or treble the unpaid wages for repeat offenders (34-14-09.1).',
    daily: 'A day\'s wages per day in default', cap: '30 days',
    wages: 'Accrued paid time off is owed at separation, with narrow exceptions for a voluntary quit within the first year on short notice after written notice at hiring (NDCC 34-14-09.2).',
    sources: [['NDCC chapter 34-14', 'https://ndlegis.gov/cencode/t34c14.pdf']] },
  { code: 'OH', name: 'Ohio', ...all(payday),
    flags: { all: 'Ohio has no separate final pay rule. Its regular pay schedule applies: wages for the 1st to the 15th by the 1st of the next month, and for the 16th to the end of the month by the 15th of the next month.' },
    note: 'Ohio\'s wage statute sets semimonthly paydays and does not have a separate deadline for final pay.',
    penalty: 'If wages stay unpaid 30 days after the regular payday with no dispute: the greater of 6% of the unpaid amount or $200 (ORC 4113.15(B)).',
    sources: [['Ohio Rev. Code 4113.15', 'https://codes.ohio.gov/ohio-revised-code/section-4113.15']] },
  { code: 'OK', name: 'Oklahoma', ...all(payday),
    note: 'Whenever employment ends, wages are due at the next regular payday for the pay period in which the work was performed, by certified mail if requested. A union contract can provide otherwise.',
    penalty: 'If wages were willfully withheld without a bona fide dispute: 2% of the unpaid wages per day, capped at the unpaid wages (40 O.S. 165.3(B)).',
    daily: '2% of unpaid wages per day (willful failures)', cap: 'The amount of the unpaid wages',
    sources: [['40 O.S. 165.3', 'https://www.oscn.net/applications/oscn/DeliverDocument.asp?CiteID=77476']] },
  { code: 'OR', name: 'Oregon', fired: bdays(1), laidoff: bdays(1), quitNotice: now, quitNoNotice: earlier(payday, bdays(5)),
    flags: { laidoff: 'Oregon\'s rule covers discharges and terminations by mutual agreement; a layoff is treated as a discharge here.', quitNotice: 'Immediate payment needs at least 48 hours notice, not counting Saturdays, Sundays and holidays. 72 calendar hours that include a weekend may not be enough.' },
    note: 'A discharged employee is paid by the end of the first business day after the discharge. An employee who quits with at least 48 hours notice (excluding weekends and holidays) is paid immediately; without it, within 5 business days or on the next payday, whichever is first. Separations on a weekend or holiday are paid by the end of the next business day.',
    penalty: 'If willful: 8 hours of pay per day at the same rate until paid, up to 30 days, and generally capped at 100% of the unpaid wages (ORS 652.150).',
    daily: '8 hours of pay per day (willful failures)', cap: '30 days',
    sources: [['ORS 652.140 and 652.150', 'https://www.oregonlegislature.gov/bills_laws/ors/ors652.html']] },
  { code: 'PA', name: 'Pennsylvania', ...all(payday),
    note: 'When an employer separates an employee, or an employee quits, wages are due no later than the next regular payday on which they would otherwise be due, by certified mail if requested.',
    penalty: 'If wages stay unpaid 30 days past the regular payday with no good-faith dispute: liquidated damages of the greater of 25% of the wages or $500 (Wage Payment and Collection Law, Section 10).',
    sources: [['Wage Payment and Collection Law (1961 Act 329), Sections 5 and 10', 'https://www.palegis.us/statutes/unconsolidated/law-information/view-statute?txtType=HTM&SessYr=1961&ActNum=0329.&SessInd=0']] },
  { code: 'RI', name: 'Rhode Island', ...all(payday),
    flags: { fired: 'If the employer is closing, merging, selling or moving the business out of state, wages are due within 24 hours.', laidoff: 'If the employer is closing, merging, selling or moving the business out of state, wages are due within 24 hours.' },
    note: 'Unpaid wages are due on the next regular payday. When separation is caused by the business closing, merging, being sold or leaving the state, within 24 hours.',
    penalty: 'Liquidated damages up to 2 times the unpaid wages, plus attorney fees (R.I. Gen. Laws 28-14-19.2).',
    wages: 'After at least one year of service, vacation accrued under a policy or agreement is owed with the final wages (28-14-4(b)).',
    sources: [['R.I. Gen. Laws 28-14-4', 'https://webserver.rilegislature.gov/Statutes/TITLE28/28-14/28-14-4.htm'], ['R.I. Gen. Laws 28-14-19.2', 'https://webserver.rilegislature.gov/Statutes/TITLE28/28-14/28-14-19.2.htm']] },
  { code: 'SC', name: 'South Carolina', ...all(hours(48)),
    flags: { all: 'The statute says "within forty-eight hours of the time of separation or the next regular payday which may not exceed thirty days," which can be read more than one way. The date shown is the 48-hour date, the earliest reading. Confirm with the South Carolina Department of Labor if you plan to use the payday option.' },
    note: 'When an employer separates an employee for any reason, wages are due within 48 hours or by the next regular payday, which may not be more than 30 days away.',
    penalty: 'The employee can recover three times the unpaid wages plus attorney fees in a civil action (S.C. Code 41-10-80(C)).',
    sources: [['S.C. Code 41-10-50 and 41-10-80', 'https://www.scstatehouse.gov/code/t41c010.php']] },
  { code: 'SD', name: 'South Dakota', ...all(payday),
    note: 'Wages are due by the next regular payday for those hours, or as soon after that as the employee returns all of the employer\'s property.',
    penalty: 'Double the wages if the employer\'s refusal to pay was oppressive, fraudulent or malicious (SDCL 60-11-7).',
    sources: [['SDCL 60-11-10', 'https://sdlegislature.gov/Statutes/60-11-10'], ['SDCL 60-11-11', 'https://sdlegislature.gov/Statutes/60-11-11'], ['SDCL 60-11-7', 'https://sdlegislature.gov/Statutes/60-11-7']] },
  { code: 'TN', name: 'Tennessee', ...all(later(payday, days(21))),
    note: 'An employee who leaves or is discharged is paid by the next regular payday or 21 calendar days, whichever occurs last.',
    penalty: 'The Tennessee Department of Labor page we used does not state a penalty; see Tenn. Code Ann. 50-2-103.',
    sources: [['Tennessee Department of Labor: final paycheck', 'https://lwdsupport.tn.gov/hc/en-us/articles/360000136028-My-employer-refuses-to-pay-me-my-final-paycheck-Does-an-employer-have-to-pay-all-wages-on-separation-date']] },
  { code: 'TX', name: 'Texas', fired: days(6), laidoff: days(6), quitNotice: payday, quitNoNotice: payday,
    flags: { laidoff: 'Texas distinguishes "discharged" from leaving "other than by discharge." An involuntary layoff is treated as a discharge here, the earlier deadline.' },
    note: 'A discharged employee is paid in full not later than the sixth day after discharge. An employee who leaves for any other reason is paid by the next regularly scheduled payday.',
    penalty: 'If the employer acted in bad faith, an administrative penalty up to the lesser of the wages in question or $1,000 (Tex. Lab. Code 61.053).',
    wages: 'Vacation, holiday, sick and severance pay count as wages only when owed under a written agreement or written policy (Tex. Lab. Code 61.001(7)).',
    sources: [['Tex. Lab. Code ch. 61 (61.014, 61.053, 61.001)', 'https://statutes.capitol.texas.gov/Docs/LA/htm/LA.61.htm']] },
  { code: 'UT', name: 'Utah', fired: hours(24), laidoff: hours(24), quitNotice: payday, quitNoNotice: payday,
    note: 'When the employer separates an employee, wages are due within 24 hours (mail postmarked within one day, a direct deposit started within 24 hours, or hand delivery counts). An employee who resigns is paid on the next regular payday.',
    penalty: 'For employer separations: if a written demand goes unpaid for 24 hours, wages continue at the same rate up to 60 days; suit must be filed within 60 days of separation (Utah Code 34-28-5(1)(c)).',
    daily: 'A day\'s wages per day after demand (employer separations)', cap: '60 days',
    sources: [['Utah Code 34-28-5', 'https://le.utah.gov/xcode/Title34/Chapter28/34-28-S5.html']] },
  { code: 'VT', name: 'Vermont', fired: hours(72), laidoff: hours(72), quitNotice: payday, quitNoNotice: payday,
    flags: { laidoff: 'The statute covers employees who are discharged or leave voluntarily; a layoff is treated as a discharge here, the earlier deadline.' },
    note: 'A discharged employee is paid within 72 hours. An employee who leaves voluntarily is paid on the last regular payday, or the following Friday if there is none.',
    penalty: 'Twice the unpaid wages, plus costs and attorney fees (21 V.S.A. 347).',
    sources: [['21 V.S.A. 342', 'https://legislature.vermont.gov/statutes/section/21/005/00342'], ['21 V.S.A. 347', 'https://legislature.vermont.gov/statutes/section/21/005/00347']] },
  { code: 'VA', name: 'Virginia', ...all(payday),
    note: 'On termination, wages are due on or before the date they would have been paid had employment not ended.',
    penalty: 'The wages plus an equal amount as liquidated damages and 8% interest; triple if the employer knowingly failed to pay; a civil penalty up to $1,000 per knowing violation (Va. Code 40.1-29).',
    sources: [['Va. Code 40.1-29', 'https://law.lis.virginia.gov/vacode/title40.1/chapter3/section40.1-29/']] },
  { code: 'WA', name: 'Washington', ...all({ k: 'periodEnd' }),
    note: 'When an employee stops working, by discharge or by choice, wages are due at the end of the established pay period. A labor-management agreement can provide otherwise.',
    penalty: 'Twice the wages if they were willfully withheld (RCW 49.52.070).',
    sources: [['RCW 49.48.010', 'https://app.leg.wa.gov/rcw/default.aspx?cite=49.48.010'], ['RCW 49.52.070', 'https://app.leg.wa.gov/rcw/default.aspx?cite=49.52.070']] },
  { code: 'WV', name: 'West Virginia', ...all(payday),
    note: 'On discharge, quit, resignation or layoff, wages are due on or before the next regular payday. Mailed pay counts as paid on the postmark date.',
    penalty: 'Two times the unpaid amount as liquidated damages, in addition to the wages (W. Va. Code 21-5-4(e)).',
    sources: [['W. Va. Code 21-5-4', 'https://code.wvlegislature.gov/21-5-4/']] },
  { code: 'WI', name: 'Wisconsin', ...all(payday),
    note: 'An employee who quits or is discharged is paid by the date they would regularly have been paid, or by the monthly payment deadline, whichever is earlier. Commission sales agents and employees with a written contract for a definite period are excluded.',
    penalty: 'A court can add up to 50% of the unpaid wages, or up to 100% if the suit comes after a Department of Workforce Development investigation (Wis. Stat. 109.11(2)).',
    sources: [['Wis. Stat. 109.03', 'https://docs.legis.wisconsin.gov/document/statutes/109.03'], ['Wis. Stat. 109.11', 'https://docs.legis.wisconsin.gov/document/statutes/109.11(2)']] },
  { code: 'WY', name: 'Wyoming', ...all(payday),
    note: 'An employee who quits or is discharged is paid no later than the employer\'s usual practice on regularly scheduled payroll dates, or as a union contract provides.',
    penalty: 'In a suit for wages, 18% annual interest from the due date, plus attorney fees and costs (W.S. 27-4-104(b)).',
    sources: [['Wyoming Statutes Title 27 (27-4-104)', 'https://wyoleg.gov/statutes/compress/title27.pdf']] },
];

export const stateByCode = (c) => STATES.find((s) => s.code === c);

// ---------------------------------------------------------------- date math (UTC calendar dates)
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
export function parseDate(s) {
  const m = DATE.exec(s || '');
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? d : null;
}
export const iso = (d) => d.toISOString().slice(0, 10);
export const longDate = (d) => d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
export const addDays = (d, n) => { const x = new Date(d.getTime()); x.setUTCDate(x.getUTCDate() + n); return x; };
export function addBusinessDays(d, n) {
  let x = new Date(d.getTime());
  let left = n;
  while (left > 0) {
    x = addDays(x, 1);
    const wd = x.getUTCDay();
    if (wd !== 0 && wd !== 6) left -= 1;
  }
  return x;
}

// Short names for each rule, used inside "earlier of" and "later of" sentences.
const PHRASE = {
  now: () => 'the last day of work',
  hours: (r) => `${r.n} hours after separation`,
  days: (r) => `${r.n} calendar days after separation`,
  bdays: (r) => `${r.n} business day${r.n === 1 ? '' : 's'} after separation`,
  payday: () => 'the next regular payday',
  periodEnd: () => 'the end of the current pay period',
};
// Plain-English sentence ending for a whole rule: "Final pay is due ..."
export function sentence(rule) {
  switch (rule.k) {
    case 'now': return 'on the last day of work';
    case 'hours': return `within ${rule.n} hours of separation`;
    case 'days': return `no later than ${rule.n} calendar days after separation`;
    case 'bdays': return `no later than ${rule.n} business day${rule.n === 1 ? '' : 's'} after separation`;
    case 'payday': return 'by the next regular payday';
    case 'periodEnd': return 'by the end of the current pay period';
    case 'demand': return 'immediately when the employee asks in writing, and the employer is in default 24 hours after that demand';
    case 'mnQuit': return 'by the first regular payday after the last day, or the second payday if the first is under 5 days away, but never more than 20 days after the last day';
    case 'none': return 'with no state deadline; federal law does not require immediate payment, and the next regular payday is the safe practice';
    case 'earlier': return `by ${rule.of.map((r) => PHRASE[r.k](r)).join(' or ')}, whichever comes first`;
    case 'later': return `by ${rule.of.map((r) => PHRASE[r.k](r)).join(' or ')}, whichever comes last`;
    default: return '';
  }
}

// Resolve one rule to a date. date is null when the rule needs an input we do not have.
export function resolve(rule, sep, { payday: pd, periodEnd: pe } = {}) {
  switch (rule.k) {
    case 'now': case 'demand': return { date: sep };
    case 'hours': return { date: addDays(sep, rule.n / 24) };
    case 'days': return { date: addDays(sep, rule.n) };
    case 'bdays': return { date: addBusinessDays(sep, rule.n) };
    case 'payday': case 'none': return { date: pd || null };
    case 'periodEnd': return { date: pe || null };
    case 'mnQuit': {
      if (!pd) return { date: null, bound: addDays(sep, 20), boundKind: 'noLaterThan' };
      const gap = Math.round((pd - sep) / 86400000);
      return { date: gap < 5 ? addDays(sep, 20) : pd };
    }
    case 'earlier': case 'later': {
      const parts = rule.of.map((r) => resolve(r, sep, { payday: pd, periodEnd: pe }));
      const known = parts.filter((p) => p.date);
      if (known.length === parts.length) {
        const pick = known.reduce((x, y) => ((rule.k === 'earlier' ? y.date < x.date : y.date > x.date) ? y : x));
        return { date: pick.date };
      }
      // A missing payday or period end: for "earlier" the known date is the latest it can be; for "later" the earliest.
      return { date: null, bound: known[0]?.date || null, boundKind: rule.k === 'earlier' ? 'noLaterThan' : 'orLater' };
    }
    default: return { date: null };
  }
}

// inputs: { state, type, separation (YYYY-MM-DD), payday (optional), periodEnd (optional), onePeriodNotice (bool) }
export function finalPayDeadline({ state, type, separation, payday = '', periodEnd = '', onePeriodNotice = false }) {
  const st = stateByCode(state);
  const sep = parseDate(separation);
  if (!st || !TYPES.some((t) => t.id === type) || !sep) return { error: 'Pick a state, the type of separation and the last day of work.' };
  const pd = payday ? parseDate(payday) : null;
  const pe = periodEnd ? parseDate(periodEnd) : null;
  if (payday && !pd) return { error: 'The payday is not a valid date.' };
  if (pd && pd < sep) return { error: 'The next regular payday cannot be before the last day of work.' };
  let rule = st[type];
  // Hawaii and New Hampshire: the faster quit deadline needs at least one full pay period of notice, not 72 hours.
  if (st.onePeriodNotice && type === 'quitNotice' && !onePeriodNotice) rule = st.quitNoNotice;
  const r = { ...resolve(rule, sep, { payday: pd, periodEnd: pe }), text: sentence(rule) };
  const flag = st.flags?.[type] || st.flags?.all || null;
  return { state: st, type, separation: sep, rule, ...r, flag, noLaw: rule.k === 'none' };
}
