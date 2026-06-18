// Generates a branded, one-page PDF deal report entirely in the browser using pdf-lib.
// Called from both the calculator (current unsaved inputs) and My Deals (a saved deal's
// stored inputs), so it accepts plain numbers/labels rather than reaching into React state.

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const NAVY = rgb(0.051, 0.106, 0.243); // #0D1B3E
const BLUE = rgb(0.043, 0.373, 1);     // #0B5FFF
const GRAY = rgb(0.42, 0.478, 0.6);    // #6B7A99
const LIGHT_GRAY = rgb(0.61, 0.659, 0.753); // #9BA8C0
const GREEN = rgb(0, 0.714, 0.478);    // #00B67A
const RED = rgb(0.898, 0.224, 0.208);  // #E53935

const formatCurrency = (val) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);

const formatPct = (val) => `${(val || 0).toFixed(2)}%`;

// Builds the row data (label/value pairs) for each calculator type, given its inputs
// and computed outputs. Keeping this separate from layout makes it easy to add a
// fourth calculator type later without touching the drawing code.
function buildReportData(toolType, inputs, label) {
  if (toolType === 'rental') {
    const downAmount = (inputs.purchasePrice * inputs.downPct) / 100;
    const loanAmount = inputs.purchasePrice - downAmount;
    const monthlyRate = inputs.interestRate / 100 / 12;
    const n = inputs.loanTermYears * 12;
    const mortgage = monthlyRate > 0 && n > 0
      ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
      : (n > 0 ? loanAmount / n : 0);
    const effectiveRent = inputs.rent * (1 - inputs.vacancyPct / 100);
    const mgmtFee = effectiveRent * (inputs.mgmtPct / 100);
    const totalExpenses = mortgage + inputs.taxes + inputs.insurance + inputs.maintenance + mgmtFee + inputs.otherExpenses;
    const noi = effectiveRent - (inputs.taxes + inputs.insurance + inputs.maintenance + mgmtFee + inputs.otherExpenses);
    const cashFlow = effectiveRent - totalExpenses;
    const cashOnCash = downAmount > 0 ? (cashFlow * 12 / downAmount) * 100 : 0;
    const capRate = inputs.purchasePrice > 0 ? (noi * 12 / inputs.purchasePrice) * 100 : 0;
    const dscr = mortgage > 0 ? noi / mortgage : 0;

    return {
      title: label || 'Rental Property Analysis',
      subtitle: 'Rental Analyzer',
      headline: { label: 'Monthly Cash Flow', value: formatCurrency(cashFlow), positive: cashFlow >= 0 },
      metrics: [
        ['Cash-on-Cash Return', formatPct(cashOnCash)],
        ['Cap Rate', formatPct(capRate)],
        ['DSCR', dscr.toFixed(2)],
      ],
      inputRows: [
        ['Purchase Price', formatCurrency(inputs.purchasePrice)],
        ['Down Payment', `${inputs.downPct}% (${formatCurrency(downAmount)})`],
        ['Loan Amount', formatCurrency(loanAmount)],
        ['Interest Rate', formatPct(inputs.interestRate)],
        ['Loan Term', `${inputs.loanTermYears} years`],
        ['Monthly Rent', formatCurrency(inputs.rent)],
        ['Vacancy Rate', formatPct(inputs.vacancyPct)],
        ['Property Taxes', formatCurrency(inputs.taxes) + '/mo'],
        ['Insurance', formatCurrency(inputs.insurance) + '/mo'],
        ['Maintenance', formatCurrency(inputs.maintenance) + '/mo'],
        ['Property Management', `${inputs.mgmtPct}% (${formatCurrency(mgmtFee)}/mo)`],
        ['Other Expenses', formatCurrency(inputs.otherExpenses) + '/mo'],
      ],
      outputRows: [
        ['Mortgage Payment (P&I)', formatCurrency(mortgage) + '/mo'],
        ['Total Monthly Expenses', formatCurrency(totalExpenses) + '/mo'],
        ['Net Operating Income', formatCurrency(noi) + '/mo'],
        ['Net Cash Flow', formatCurrency(cashFlow) + '/mo'],
        ['Annual Cash Flow', formatCurrency(cashFlow * 12)],
      ],
    };
  }

  if (toolType === 'flip') {
    const totalIn = inputs.flipPurchase + inputs.rehabCost;
    const holdingCosts = (inputs.flipPurchase * inputs.holdingCostPct / 100) * inputs.holdingMonths;
    const agentFees = inputs.arv * inputs.agentPct / 100;
    const closingCosts = inputs.arv * inputs.closingCostPct / 100;
    const totalCosts = totalIn + holdingCosts + agentFees + closingCosts;
    const flipProfit = inputs.arv - totalCosts;
    const flipROI = totalIn > 0 ? (flipProfit / totalIn) * 100 : 0;
    const maxAllowable = inputs.arv * 0.7 - inputs.rehabCost;

    return {
      title: label || 'Fix & Flip Analysis',
      subtitle: 'Fix & Flip Calculator',
      headline: { label: 'Net Profit', value: formatCurrency(flipProfit), positive: flipProfit >= 0 },
      metrics: [
        ['ROI', formatPct(flipROI)],
        ['Max Allowable Offer', formatCurrency(maxAllowable)],
        ['Total Cash In', formatCurrency(totalIn)],
      ],
      inputRows: [
        ['Purchase Price', formatCurrency(inputs.flipPurchase)],
        ['Rehab / Renovation Cost', formatCurrency(inputs.rehabCost)],
        ['After Repair Value (ARV)', formatCurrency(inputs.arv)],
        ['Holding Period', `${inputs.holdingMonths} months`],
        ['Monthly Holding Cost', formatPct(inputs.holdingCostPct)],
        ['Agent Commission', formatPct(inputs.agentPct)],
        ['Closing Costs', formatPct(inputs.closingCostPct)],
      ],
      outputRows: [
        ['Holding Costs', formatCurrency(holdingCosts)],
        ['Agent Fees', formatCurrency(agentFees)],
        ['Closing Costs', formatCurrency(closingCosts)],
        ['Total All-In Cost', formatCurrency(totalCosts)],
        ['Net Profit', formatCurrency(flipProfit)],
        ['70% Rule Check', inputs.flipPurchase <= maxAllowable ? 'Passes' : 'Exceeds — overpaying'],
      ],
    };
  }

  // dscr
  const dscrMonthlyRate = inputs.dscrRate / 100 / 12;
  const dscrN = inputs.dscrTerm * 12;
  const dscrPayment = dscrMonthlyRate > 0 && dscrN > 0
    ? inputs.dscrLoanAmount * (dscrMonthlyRate * Math.pow(1 + dscrMonthlyRate, dscrN)) / (Math.pow(1 + dscrMonthlyRate, dscrN) - 1)
    : (dscrN > 0 ? inputs.dscrLoanAmount / dscrN : 0);
  const dscrPITI = dscrPayment + inputs.dscrTaxes + inputs.dscrInsurance;
  const dscrRatio = dscrPITI > 0 ? inputs.dscrRent / dscrPITI : 0;
  const minRentNeeded = dscrPITI * 1.25;

  return {
    title: label || 'DSCR Qualification Analysis',
    subtitle: 'DSCR Qualifier',
    headline: { label: 'DSCR Ratio', value: dscrRatio.toFixed(2), positive: dscrRatio >= 1.25 },
    metrics: [
      ['Monthly PITI', formatCurrency(dscrPITI)],
      ['Min Rent Needed', formatCurrency(minRentNeeded)],
      ['Status', dscrRatio >= 1.25 ? 'Qualifies' : 'Does Not Qualify'],
    ],
    inputRows: [
      ['Loan Amount', formatCurrency(inputs.dscrLoanAmount)],
      ['Interest Rate', formatPct(inputs.dscrRate)],
      ['Loan Term', `${inputs.dscrTerm} years`],
      ['Monthly Gross Rent', formatCurrency(inputs.dscrRent)],
      ['Monthly Property Taxes', formatCurrency(inputs.dscrTaxes)],
      ['Monthly Insurance', formatCurrency(inputs.dscrInsurance)],
    ],
    outputRows: [
      ['Principal & Interest', formatCurrency(dscrPayment)],
      ['Total PITI', formatCurrency(dscrPITI)],
      ['DSCR (Rent ÷ PITI)', dscrRatio.toFixed(3)],
      ['Minimum Rent to Qualify (1.25x)', formatCurrency(minRentNeeded)],
    ],
  };
}

export async function generateDealReportPdf(toolType, inputs, label) {
  const data = buildReportData(toolType, inputs, label);

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // US Letter
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  const pageWidth = 612;
  let y = 792;

  // Header band
  page.drawRectangle({ x: 0, y: y - 90, width: pageWidth, height: 90, color: NAVY });
  page.drawRectangle({ x: margin, y: y - 50, width: 5, height: 22, color: BLUE });
  page.drawText('SpreadRun', { x: margin + 14, y: y - 48, size: 18, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('DEAL ANALYZER', { x: margin + 14, y: y - 64, size: 8, font, color: GRAY });
  page.drawText(data.subtitle.toUpperCase(), {
    x: pageWidth - margin - fontBold.widthOfTextAtSize(data.subtitle.toUpperCase(), 9),
    y: y - 48, size: 9, font: fontBold, color: BLUE,
  });
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  page.drawText(dateStr, {
    x: pageWidth - margin - font.widthOfTextAtSize(dateStr, 9),
    y: y - 64, size: 9, font, color: GRAY,
  });
  y -= 90;

  // Title
  y -= 36;
  page.drawText(data.title, { x: margin, y, size: 20, font: fontBold, color: NAVY });

  // Headline metric box
  y -= 50;
  const headlineColor = data.headline.positive ? GREEN : RED;
  page.drawRectangle({ x: margin, y: y - 14, width: pageWidth - margin * 2, height: 64, color: rgb(0.961, 0.969, 1), borderColor: rgb(0.84, 0.878, 1), borderWidth: 1 });
  page.drawText(data.headline.label.toUpperCase(), { x: margin + 20, y: y + 28, size: 9, font: fontBold, color: GRAY });
  page.drawText(String(data.headline.value), { x: margin + 20, y: y + 8, size: 26, font: fontBold, color: headlineColor });

  // Secondary metrics, three across
  const metricColWidth = (pageWidth - margin * 2) / 3;
  data.metrics.forEach((m, i) => {
    const mx = margin + i * metricColWidth + 20;
    page.drawText(m[0].toUpperCase(), { x: mx, y: y - 4, size: 7.5, font: fontBold, color: GRAY });
  });

  y -= 50;

  const drawSectionTable = (heading, rows) => {
    page.drawText(heading.toUpperCase(), { x: margin, y, size: 10, font: fontBold, color: BLUE });
    y -= 18;
    rows.forEach(([k, v], i) => {
      if (y < 60) return; // simple guard against overflow; report is designed to fit one page
      const rowY = y;
      if (i % 2 === 0) {
        page.drawRectangle({ x: margin, y: rowY - 4, width: pageWidth - margin * 2, height: 18, color: rgb(0.973, 0.98, 1) });
      }
      page.drawText(k, { x: margin + 10, y: rowY, size: 10, font, color: rgb(0.24, 0.31, 0.43) });
      const valWidth = fontBold.widthOfTextAtSize(String(v), 10);
      page.drawText(String(v), { x: pageWidth - margin - 10 - valWidth, y: rowY, size: 10, font: fontBold, color: NAVY });
      y -= 18;
    });
    y -= 14;
  };

  drawSectionTable('Inputs', data.inputRows);
  drawSectionTable('Results', data.outputRows);

  // Footer
  page.drawLine({ start: { x: margin, y: 50 }, end: { x: pageWidth - margin, y: 50 }, thickness: 1, color: rgb(0.92, 0.94, 1) });
  page.drawText('SpreadRun · spreadrun.com · For informational purposes only. Not financial advice.', {
    x: margin, y: 34, size: 8, font, color: LIGHT_GRAY,
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeLabel = (label || data.subtitle).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  a.download = `spreadrun-${safeLabel}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
