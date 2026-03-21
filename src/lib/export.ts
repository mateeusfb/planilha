import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Exporta um elemento HTML como PDF real (download direto).
 */
export async function exportToPDF(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // A4 dimensions in mm
  const pdfWidth = 210;
  const pdfHeight = 297;
  const margin = 10;
  const contentWidth = pdfWidth - margin * 2;
  const contentHeight = (imgHeight * contentWidth) / imgWidth;

  const pdf = new jsPDF({
    orientation: contentHeight > pdfHeight ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // If content is taller than one page, split across pages
  const pageContentHeight = pdfHeight - margin * 2;
  let remainingHeight = contentHeight;
  let yOffset = 0;

  while (remainingHeight > 0) {
    if (yOffset > 0) pdf.addPage();

    pdf.addImage(imgData, 'PNG', margin, margin - yOffset, contentWidth, contentHeight);
    remainingHeight -= pageContentHeight;
    yOffset += pageContentHeight;
  }

  pdf.save(`${filename}.pdf`);
}

/**
 * Exporta dados como CSV (download direto).
 */
export function exportToCSV(headers: string[], rows: string[][], filename: string): void {
  const escape = (v: string) => {
    if (v.includes(',') || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const csv = [
    headers.map(escape).join(','),
    ...rows.map(row => row.map(escape).join(',')),
  ].join('\n');

  // BOM for Excel UTF-8 compatibility
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
