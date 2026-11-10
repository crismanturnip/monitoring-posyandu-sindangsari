import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import { REPORT_TITLE, reportDate, reportDateGroups, reportEntryFields, reportPeriodText, reportTimestamp } from './report-document';
import type { ReportFilters, ReportRow } from './reports';

const PAGE = { width: 595.28, height: 841.89, left: 85.04, right: 510.24, bottom: 70 };
const BODY_SIZE = 12;
const LINE_HEIGHT = 20.7;

function printableText(value: string, font: PDFFont) {
  return Array.from(value.normalize('NFC').replace(/\r\n?/g, '\n').replace(/\t/g, '    '), (char) => {
    if (char === '\n') return char;
    try { font.encodeText(char); return char; } catch { return '?'; }
  }).join('');
}

export function wrapReportText(value: string, font: PDFFont, size: number, maxWidth: number, preserveUnicode = false) {
  const lines: string[] = [];
  const text = preserveUnicode ? value.replace(/\r\n?/g, '\n').replace(/\t/g, '    ') : printableText(value, font);
  const width = (line: string) => font.widthOfTextAtSize(preserveUnicode ? printableText(line, font) : line, size);
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (width(candidate) <= maxWidth) { line = candidate; continue; }
      if (line) { lines.push(line); line = ''; }
      for (const char of word) {
        if (line && width(line + char) > maxWidth) { lines.push(line); line = ''; }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function createReportPdf(rows: ReportRow[], filters: ReportFilters, generatedBy: string, generatedAt = new Date()) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.TimesRoman);
  const bold = await document.embedFont(StandardFonts.TimesRomanBold);
  document.setTitle(REPORT_TITLE);
  document.setAuthor(generatedBy);
  document.setCreationDate(generatedAt);
  document.setModificationDate(generatedAt);
  let page = document.addPage([PAGE.width, PAGE.height]);
  let y = 672.1;
  let firstDateY = y;

  const drawHeader = () => {
    const timestamp = printableText(reportTimestamp(generatedAt), regular);
    page.drawText(timestamp, { x: PAGE.width - 30 - regular.widthOfTextAtSize(timestamp, 10), y: 797.2, font: regular, size: 10, color: rgb(0.5, 0.5, 0.5) });
    const title = printableText(REPORT_TITLE, bold);
    page.drawText(title, { x: (PAGE.width - bold.widthOfTextAtSize(title, 16)) / 2, y: 741.9, size: 16, font: bold });
    const periodLines = wrapReportText(reportPeriodText(filters), regular, BODY_SIZE, PAGE.right - PAGE.left);
    periodLines.forEach((line, index) => page.drawText(line, { x: (PAGE.width - regular.widthOfTextAtSize(line, BODY_SIZE)) / 2, y: 717.8 - index * 17, font: regular, size: BODY_SIZE }));
    firstDateY = Math.min(672.1, 717.8 - periodLines.length * 17 - 28);
    y = firstDateY;
  };
  const drawDate = (date: string) => {
    page.drawText(reportDate(date), { x: PAGE.left, y, size: BODY_SIZE, font: regular });
    y -= 23;
  };
  const nextPage = (date: string) => {
    page = document.addPage([PAGE.width, PAGE.height]);
    drawHeader();
    drawDate(date);
  };

  drawHeader();
  let number = 0;
  for (const group of reportDateGroups(rows)) {
    let dateDrawn = false;
    for (const row of group.records) {
      number += 1;
      const lines = reportEntryFields(row).flatMap(([label, value]) => wrapReportText(`${label} : ${value}`, regular, BODY_SIZE, PAGE.right - PAGE.left - 36));
      const availableOnNewPage = firstDateY - 23 - PAGE.bottom;
      const required = Math.min(lines.length * LINE_HEIGHT, availableOnNewPage);
      if (y - required - (dateDrawn ? 0 : 23) < PAGE.bottom) {
        nextPage(group.date);
        dateDrawn = true;
      }
      if (!dateDrawn) { drawDate(group.date); dateDrawn = true; }
      lines.forEach((line, index) => {
        if (y < PAGE.bottom) nextPage(group.date);
        if (index === 0) page.drawText(`${number}.`, { x: PAGE.left + 18, y, size: BODY_SIZE, font: regular });
        if (line) page.drawText(line, { x: PAGE.left + 36, y, size: BODY_SIZE, font: regular });
        y -= LINE_HEIGHT;
      });
      y -= LINE_HEIGHT;
    }
    y -= 16;
  }
  if (rows.length === 0) page.drawText('Tidak ada data untuk filter yang dipilih.', { x: PAGE.left, y, size: BODY_SIZE, font: regular });
  return document.save();
}
