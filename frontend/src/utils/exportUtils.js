import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Utility functions for exporting data to CSV, Excel, and PDF.
 */

// ── Export to CSV / Excel ──────────────────────────────────────────────

export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToExcel = (data, filename) => {
  if (!data || data.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

// ── Export to PDF ──────────────────────────────────────────────────────

export const exportToPDF = (data, columns, filename, title) => {
  if (!data || data.length === 0) return;
  
  const doc = new jsPDF();
  
  // Title
  if (title) {
    doc.setFontSize(16);
    doc.text(title, 14, 15);
  }

  // Generate table
  doc.autoTable({
    startY: title ? 25 : 15,
    head: [columns.map(col => col.header)],
    body: data.map(row => columns.map(col => row[col.key] || '')),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [63, 131, 248] }, // Brand primary color
  });

  doc.save(`${filename}.pdf`);
};
