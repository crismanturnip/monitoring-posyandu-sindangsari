import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { ReportFilters, ReportRow } from './reports';

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

export function createReportCsv(rows: ReportRow[]) {
  const header = ['Tanggal', 'Kategori', 'Nama', 'Posyandu', 'Hasil', 'Catatan'];
  const lines = rows.map((row) => [row.date, row.category, row.name, row.posyandu, row.result, row.notes].map(csvCell).join(','));
  return `\uFEFF${header.map(csvCell).join(',')}\r\n${lines.join('\r\n')}`;
}

const pdfSafe = (value: string) => value.replace(/[^\x20-\x7E\xA0-\xFF]/g, '?').replace(/\s+/g, ' ').trim();
const clipped = (value: string, length = 105) => pdfSafe(value).slice(0, length);

export async function createReportPdf(rows: ReportRow[], filters: ReportFilters, generatedBy: string) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page = document.addPage([595.28, 841.89]);
  let y = 795;

  const addHeader = () => {
    page.drawText('Laporan Monitoring Posyandu Desa Sindangsari', { x: 40, y, size: 16, font: bold, color: rgb(0.18, 0.49, 0.2) });
    y -= 24;
    page.drawText(`Periode: ${filters.startDate} s.d. ${filters.endDate} | Dibuat oleh: ${clipped(generatedBy, 45)}`, { x: 40, y, size: 9, font: regular });
    y -= 28;
  };

  addHeader();
  if (rows.length === 0) page.drawText('Tidak ada data untuk filter yang dipilih.', { x: 40, y, size: 11, font: regular });

  rows.forEach((row, index) => {
    if (y < 70) {
      page = document.addPage([595.28, 841.89]);
      y = 795;
      addHeader();
    }
    page.drawText(`${index + 1}. ${clipped(row.date)} | ${clipped(row.category)} | ${clipped(row.name, 42)}`, { x: 40, y, size: 9, font: bold });
    y -= 13;
    page.drawText(`Posyandu: ${clipped(row.posyandu, 45)} | ${clipped(row.result, 50)}`, { x: 52, y, size: 8.5, font: regular });
    y -= 13;
    page.drawText(`Catatan: ${clipped(row.notes, 92)}`, { x: 52, y, size: 8.5, font: regular, color: rgb(0.3, 0.35, 0.31) });
    y -= 19;
  });

  return document.save();
}
