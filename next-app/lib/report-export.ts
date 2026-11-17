import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import { REPORT_TITLE, reportPeriodText, reportTimestamp } from './report-document';
import { reportTables, reportCellText } from './report-tables';
import type { ReportFilters, ReportRow } from './reports';

const PAGE = { width: 1190.55, height: 841.89, left: 28, bottom: 36 };
const BODY_SIZE = 9;
const LINE_HEIGHT = 13;
const PADDING_X = 6;
const PADDING_Y = 8;

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
  const border = rgb(0.57, 0.61, 0.64);
  const draw = (text: string, x: number, y: number, size = BODY_SIZE, heading = false) => {
    page.drawText(printableText(text, heading ? bold : regular), { x, y, size, font: heading ? bold : regular });
  };
  let page = document.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - 30;
  const pageHeader = () => {
    y = PAGE.height - 30;
    draw(reportTimestamp(generatedAt), PAGE.left, y, 9);
    y -= 29;
    draw(REPORT_TITLE, PAGE.left, y, 16, true);
    y -= 22;
    const posyandu = filters.posyanduId ? [...new Set(rows.map(row => row.posyandu))].join(', ') || 'Sesuai filter Posyandu' : 'Semua Posyandu yang dapat diakses';
    const metadata = [reportPeriodText(filters), `Posyandu: ${posyandu}`, `Petugas: ${generatedBy} | Jumlah catatan: ${rows.length}`];
    for (const text of metadata) {
      for (const line of wrapReportText(text, regular, 10, PAGE.width - PAGE.left * 2)) { draw(line, PAGE.left, y, 10); y -= 15; }
    }
    y -= 10;
  };
  pageHeader();
  const tables = reportTables(rows, filters);
  for (const [tableIndex, table] of tables.entries()) {
    const totalWidth = table.columns.reduce((sum, column) => sum + column.width, 0);
    const scale = Math.min(1, (PAGE.width - PAGE.left * 2) / totalWidth);
    const widths = table.columns.map(column => column.width * scale);
    const tableWidth = widths.reduce((sum, width) => sum + width, 0);
    const prepare = (texts: string[], heading = false) => texts.map((value, i) => wrapReportText(value, heading ? bold : regular, BODY_SIZE, widths[i] - PADDING_X * 2));
    const headerLines = prepare(table.columns.map(column => column.label), true);
    const headerHeight = Math.max(...headerLines.map(lines => lines.length)) * LINE_HEIGHT + PADDING_Y * 2;
    const drawRow = (lines: string[][], height: number, heading = false) => {
      page.drawRectangle({ x: PAGE.left, y: y - height, width: tableWidth, height, color: heading ? rgb(0.95, 0.96, 0.97) : rgb(1, 1, 1) });
      let x = PAGE.left;
      lines.forEach((cell, index) => {
        cell.forEach((line, lineIndex) => draw(line, x + PADDING_X, y - PADDING_Y - BODY_SIZE - lineIndex * LINE_HEIGHT, BODY_SIZE, heading));
        page.drawLine({ start: { x, y }, end: { x, y: y - height }, thickness: 0.45, color: border });
        x += widths[index];
      });
      page.drawLine({ start: { x, y }, end: { x, y: y - height }, thickness: 0.45, color: border });
      for (const rowY of [y, y - height]) page.drawLine({ start: { x: PAGE.left, y: rowY }, end: { x, y: rowY }, thickness: 0.45, color: border });
      y -= height;
    };
    const sectionHeader = () => {
      draw(`${table.title} (${table.rows.length} catatan)`, PAGE.left, y - 12, 12, true);
      y -= 28;
      drawRow(headerLines, headerHeight, true);
    };
    const newPage = () => {
      page = document.addPage([PAGE.width, PAGE.height]);
      pageHeader();
      sectionHeader();
    };
    if (tableIndex > 0) y -= 24;
    if (y - PAGE.bottom < 28 + headerHeight + 40) {
      newPage();
    } else {
      sectionHeader();
    }
    if (table.rows.length === 0) {
      page.drawRectangle({ x: PAGE.left, y: y - 40, width: tableWidth, height: 40, borderColor: border, borderWidth: 0.45 });
      draw('Tidak ada data untuk filter yang dipilih.', PAGE.left + PADDING_X, y - 25);
      y -= 40;
    }
    for (const [index, row] of table.rows.entries()) {
      const lines = prepare(table.columns.map(column => reportCellText(column.value(row, index))));
      const totalLines = Math.max(...lines.map(cell => cell.length));
      let offset = 0;
      while (offset < totalLines) {
        let capacity = Math.floor((y - PAGE.bottom - PADDING_Y * 2) / LINE_HEIGHT);
        const required = totalLines - offset;
        if (y - PAGE.bottom < 36 || capacity < Math.min(required, 3)) { newPage(); capacity = Math.floor((y - PAGE.bottom - PADDING_Y * 2) / LINE_HEIGHT); }
        const length = Math.min(required, capacity);
        const chunk = lines.map((cell, column) => offset > 0 && (column === 0 || column === 2) && cell.length <= length ? cell : cell.slice(offset, offset + length));
        const height = Math.max(36, length * LINE_HEIGHT + PADDING_Y * 2);
        drawRow(chunk, height);
        offset += length;
        if (offset < totalLines) newPage();
      }
    }
  }
  document.getPages().forEach((item, index) => {
    const text = `Halaman ${index + 1} dari ${document.getPageCount()}`;
    item.drawText(text, { x: PAGE.width - PAGE.left - regular.widthOfTextAtSize(text, 9), y: 18, font: regular, size: 9, color: rgb(0.4, 0.4, 0.4) });
  });
  return document.save();
}
