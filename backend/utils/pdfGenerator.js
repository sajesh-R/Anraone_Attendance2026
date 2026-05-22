const puppeteer = require('puppeteer');

/**
 * Converts a number to words in Indian numbering system format.
 * @param {Number} amount 
 * @returns {String}
 */
const convertNumberToWords = (amount) => {
  const num = Math.round(amount);
  if (num === 0) return 'ZERO ONLY';
  
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanOneThousand = (n) => {
    if (n < 20) return a[n];
    const digit = n % 10;
    if (n < 100) return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
    return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 === 0 ? '' : ' and ' + convertLessThanOneThousand(n % 100));
  };

  const convert = (n) => {
    if (n === 0) return '';
    let temp = '';
    
    // Crores
    if (Math.floor(n / 10000000) > 0) {
      temp += convert(Math.floor(n / 10000000)) + ' Crore ';
      n %= 10000000;
    }
    // Lakhs
    if (Math.floor(n / 100000) > 0) {
      temp += convertLessThanOneThousand(Math.floor(n / 100000)) + ' Lakh ';
      n %= 100000;
    }
    // Thousands
    if (Math.floor(n / 1000) > 0) {
      temp += convertLessThanOneThousand(Math.floor(n / 1000)) + ' Thousand ';
      n %= 1000;
    }
    // Hundreds
    if (n > 0) {
      temp += convertLessThanOneThousand(n);
    }
    
    return temp.trim();
  };

  return (convert(num) + ' ONLY').toUpperCase();
};

/**
 * Generates a PDF Buffer of the payslip using Puppeteer.
 * @param {Object} payslip - The Payslip document populated with employeeId.
 * @returns {Promise<Buffer>}
 */
exports.generatePayslipPDF = async (payslip) => {
  const employee = payslip.employeeId;
  if (!employee) {
    throw new Error('Employee details not populated on payslip.');
  }

  // Parse payrollMonth (e.g. "2026-05") into month name and year
  const monthNames = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
  ];
  const [yearStr, monthStr] = payslip.payrollMonth.split('-');
  const monthName = monthNames[parseInt(monthStr, 10) - 1] || 'UNKNOWN';
  const yearName = yearStr || '';

  // Format currency helper
  const fmt = (val) => Number(val || 0).toFixed(2);
  const fmtNoDec = (val) => Math.round(val || 0).toString();

  // Calculations for Additions
  const basic = payslip.earningsBreakdown.baseSalary || 0;
  const hra = payslip.earningsBreakdown.hra || 0;
  const transport = payslip.earningsBreakdown.transportAllowance || 0;
  const medical = payslip.earningsBreakdown.medicalAllowance || 0;
  const special = payslip.earningsBreakdown.specialAllowance || 0;
  const ot = payslip.earningsBreakdown.overtimePay || 0;
  const totalEarnings = basic + hra + transport + medical + special + ot;

  // Calculations for Deductions
  const epf = payslip.deductionsBreakdown.pf || 0;
  const esic = payslip.deductionsBreakdown.esi || 0;
  const pt = payslip.deductionsBreakdown.tds || 0;
  const loan = payslip.deductionsBreakdown.loanDeduction || 0;
  const leaveSalary = payslip.deductionsBreakdown.lopDeduction || 0;
  const otherDed = (payslip.deductionsBreakdown.advanceDeduction || 0) + (payslip.deductionsBreakdown.halfDayDeduction || 0);
  const totalDeductions = epf + esic + pt + loan + leaveSalary + otherDed;

  const netPay = payslip.netPay || 0;
  const netPayInWords = convertNumberToWords(netPay);

  // Address split for two rows if long
  const address = employee.address || 'N/A';
  let addressLine1 = address;
  let addressLine2 = '';
  if (address.length > 30) {
    const spaceIdx = address.lastIndexOf(' ', 30);
    const splitIdx = spaceIdx > 10 ? spaceIdx : 30;
    addressLine1 = address.substring(0, splitIdx);
    addressLine2 = address.substring(splitIdx).trim();
  }

  // Formatting dates
  const joinDate = employee.joinDate ? new Date(employee.joinDate).toLocaleDateString('en-GB') : 'N/A';
  const docDate = payslip.createdAt ? new Date(payslip.createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payslip - ${employee.fullName}</title>
  <style>
    body {
      font-family: Calibri, 'Segoe UI', Arial, sans-serif;
      margin: 0;
      padding: 30px;
      background-color: #fff;
      color: #000;
      font-size: 11px;
    }
    .payslip-container {
      width: 100%;
      max-width: 750px;
      margin: 0 auto;
    }
    .payslip-box {
      width: 100%;
      box-sizing: border-box;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 2px solid #000;
    }
    td, th {
      border: 1px solid #000;
      padding: 6px 8px;
      vertical-align: middle;
      box-sizing: border-box;
      height: 25px;
    }
    .no-border-top { border-top: none !important; }
    .no-border-bottom { border-bottom: none !important; }
    .no-border-left { border-left: none !important; }
    .no-border-right { border-right: none !important; }
    
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    
    .font-bold { font-weight: bold; }
    .title {
      font-size: 18px;
      letter-spacing: 1.5px;
      padding: 10px 0;
    }
    .subtitle {
      font-size: 11px;
      padding: 6px 0;
      letter-spacing: 0.5px;
    }
    .addition-deduction-header {
      background-color: #f5f5f5;
      font-size: 11px;
      letter-spacing: 1px;
      padding: 5px 0;
    }
    
    /* Double vertical border split */
    .border-double-right {
      border-right: 3px double #000 !important;
    }
    .border-double-right + td {
      border-left: none !important;
    }
  </style>
</head>
<body>
  <div class="payslip-container">
    <div class="payslip-box">
      <table>
        <colgroup>
          <col style="width: 20%;">
          <col style="width: 4%;">
          <col style="width: 26%;">
          <col style="width: 20%;">
          <col style="width: 4%;">
          <col style="width: 26%;">
        </colgroup>

        <!-- Main Title -->
        <tr>
          <td colspan="6" class="text-center font-bold title">PAY SLIP</td>
        </tr>
        <!-- Subtitle (Salary Month) -->
        <tr>
          <td colspan="6" class="text-center font-bold subtitle">SALARY FOR THE MONTH OF ${monthName} - ${yearName}</td>
        </tr>
        
        <!-- Employee Info Grid -->
        <tr>
          <td class="font-bold">EMOLOYEE NAME</td>
          <td class="text-center">:</td>
          <td>${employee.fullName.toUpperCase()}</td>
          <td class="font-bold">ESTABLISHED ID</td>
          <td class="text-center">:</td>
          <td>${employee.employeeId || '0'}</td>
        </tr>
        <tr>
          <td class="font-bold no-border-bottom">ADDRESS</td>
          <td class="text-center no-border-bottom">:</td>
          <td class="no-border-bottom">${addressLine1.toUpperCase()}</td>
          <td class="font-bold">UAN NO.</td>
          <td class="text-center">:</td>
          <td>0</td>
        </tr>
        <tr>
          <td class="font-bold no-border-top no-border-bottom"></td>
          <td class="no-border-top no-border-bottom"></td>
          <td class="no-border-top no-border-bottom">${addressLine2 ? addressLine2.toUpperCase() : ''}</td>
          <td class="font-bold">E.S.I.C. NO :-</td>
          <td class="text-center">:</td>
          <td>0</td>
        </tr>
        <tr>
          <td class="font-bold no-border-top">PHONE</td>
          <td class="text-center no-border-top">:</td>
          <td class="no-border-top">${employee.phone || 'N/A'}</td>
          <td class="font-bold">DATE OF JOINING</td>
          <td class="text-center">:</td>
          <td>${joinDate}</td>
        </tr>
        
        <!-- Additions & Deductions Section Headers -->
        <tr>
          <td colspan="3" class="text-center font-bold addition-deduction-header border-double-right">ADDITION</td>
          <td colspan="3" class="text-center font-bold addition-deduction-header">DEDUCTION</td>
        </tr>
        
        <!-- Additions vs Deductions Side by Side -->
        <tr>
          <td class="font-bold">BASIC</td>
          <td class="text-center">:</td>
          <td class="text-right border-double-right">${fmt(basic)}</td>
          <td class="font-bold">E.P.F.</td>
          <td class="text-center">:</td>
          <td class="text-right">${fmt(epf)}</td>
        </tr>
        <tr>
          <td class="font-bold">HRA</td>
          <td class="text-center">:</td>
          <td class="text-right border-double-right">${fmt(hra)}</td>
          <td class="font-bold">E.S.I.C.</td>
          <td class="text-center">:</td>
          <td class="text-right">${fmt(esic)}</td>
        </tr>
        <tr>
          <td class="font-bold">TRANSPORT</td>
          <td class="text-center">:</td>
          <td class="text-right border-double-right">${fmt(transport)}</td>
          <td class="font-bold">P.T.</td>
          <td class="text-center">:</td>
          <td class="text-right">${fmt(pt)}</td>
        </tr>
        <tr>
          <td class="font-bold">MEDICAL</td>
          <td class="text-center">:</td>
          <td class="text-right border-double-right">${fmt(medical)}</td>
          <td class="font-bold">LOAN</td>
          <td class="text-center">:</td>
          <td class="text-right">${fmt(loan)}</td>
        </tr>
        <tr>
          <td class="font-bold">SPECIAL</td>
          <td class="text-center">:</td>
          <td class="text-right border-double-right">${fmt(special)}</td>
          <td class="font-bold">LEAVE SALARY</td>
          <td class="text-center">0</td>
          <td class="text-right">${fmt(leaveSalary)}</td>
        </tr>
        <tr>
          <td class="font-bold">O.T.</td>
          <td class="text-center">:</td>
          <td class="text-right border-double-right">${fmt(ot)}</td>
          <td class="font-bold">OTHER DEDU.</td>
          <td class="text-center">:</td>
          <td class="text-right">${fmt(otherDed)}</td>
        </tr>
        
        <!-- Totals -->
        <tr>
          <td class="font-bold">TOTAL</td>
          <td class="text-center">:</td>
          <td class="text-right font-bold border-double-right">${fmtNoDec(totalEarnings)}</td>
          <td class="font-bold">TOTAL</td>
          <td class="text-center">:</td>
          <td class="text-right font-bold">${fmtNoDec(totalDeductions)}</td>
        </tr>
        
        <!-- Net Salary -->
        <tr>
          <td colspan="2" class="font-bold">NETSALARY</td>
          <td class="text-right font-bold border-double-right">${fmtNoDec(netPay)}</td>
          <td></td>
          <td class="text-center">:</td>
          <td></td>
        </tr>
        
        <!-- Net Salary In Words -->
        <tr>
          <td colspan="6" class="font-bold" style="height: 30px;">
            Net Salary (In Words) : <span style="font-weight: normal; margin-left: 10px;">RUPEES ${netPayInWords}</span>
          </td>
        </tr>
        
        <!-- Bottom info (Payment details, Bank details, Signature box) -->
        <tr>
          <td class="font-bold">CHQEUE NO.</td>
          <td colspan="2" class="border-double-right">: THROUGH NET BANKING</td>
          <td class="font-bold">DATE</td>
          <td class="text-center">:</td>
          <td>${docDate}</td>
        </tr>
        <tr>
          <td class="font-bold no-border-bottom">BANK NAME</td>
          <td colspan="2" class="border-double-right no-border-bottom">: </td>
          <td colspan="3" class="text-center font-bold no-border-bottom" style="padding-top: 15px;">
            FOR, ANRAONE ATTENDANCE SYSTEM
          </td>
        </tr>
        <tr style="height: 40px;">
          <td class="no-border-top no-border-bottom"></td>
          <td colspan="2" class="border-double-right no-border-top no-border-bottom"></td>
          <td colspan="3" class="no-border-top no-border-bottom"></td>
        </tr>
        <tr>
          <td class="no-border-top"></td>
          <td colspan="2" class="border-double-right no-border-top"></td>
          <td colspan="3" class="text-center font-bold no-border-top" style="font-size: 10px; padding-bottom: 10px;">
            <span style="border-top: 1px solid #000; padding-top: 4px; width: 180px; display: inline-block;">AUTHORISED SIGNATORY</span>
          </td>
        </tr>
      </table>
    </div>
  </div>
</body>
</html>
  `;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        bottom: '20px',
        left: '20px',
        right: '20px'
      }
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
};
