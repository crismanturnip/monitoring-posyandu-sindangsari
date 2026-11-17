import { Workbook, type Worksheet, type PaperSize } from 'exceljs';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { REPORT_TITLE, reportPeriodText, reportTimestamp } from './report-document';
import { reportTables, reportCellText, type ReportCell } from './report-tables';
import { wrapReportText } from './report-export';
import type { ReportFilters, ReportRow } from './reports';

const font = { name: 'Times New Roman', size: 11 };
const border = { style: 'thin' as const, color: { argb: 'FF808080' } };
const MAX_LINES = 24;

function mergedText(sheet: Worksheet, row: number, columns: number, text: string, bold = false) {
  sheet.mergeCells(row, 1, row, columns);
  const cell = sheet.getCell(row, 1);
  cell.value = text;
  cell.font = { ...font, bold };
  cell.alignment = { vertical: 'middle', wrapText: true };
  sheet.getRow(row).height = 28;
}

export async function createReportExcel(rows: ReportRow[], filters: ReportFilters, generatedBy: string, generatedAt = new Date()) {
  const workbook = new Workbook();
  workbook.creator = generatedBy;
  workbook.created = generatedAt;
  workbook.modified = generatedAt;
  workbook.title = REPORT_TITLE;
  workbook.subject = reportPeriodText(filters);
  const tables = reportTables(rows, filters);
  const columnCount = Math.max(...tables.map(table => table.columns.length));
  const sheet = workbook.addWorksheet('Laporan', {
    views: [{ state: 'normal', showGridLines: true }],
    properties: { defaultRowHeight: 28 },
    pageSetup: {
      // OOXML paper size 8 is A3; ExcelJS's enum omits it.
      paperSize: 8 as PaperSize, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    },
  });
  // Column widths belong to the whole worksheet, so allow space for every category.
  sheet.columns = Array.from({ length: columnCount }, (_, index) => ({
    width: Math.max(10, ...tables.map(table => (table.columns[index]?.width ?? 0) / 4.7)), style: { font },
  }));
  mergedText(sheet, 1, columnCount, REPORT_TITLE, true);
  mergedText(sheet, 2, columnCount, reportPeriodText(filters));
  const posyandu = filters.posyanduId ? [...new Set(rows.map(row => row.posyandu))].join(', ') || 'Sesuai filter Posyandu' : 'Semua Posyandu yang dapat diakses';
  mergedText(sheet, 3, columnCount, 'Posyandu: ' + posyandu);
  mergedText(sheet, 4, columnCount, 'Petugas: ' + generatedBy + ' | Jumlah catatan: ' + rows.length);
  mergedText(sheet, 5, columnCount, reportTimestamp(generatedAt));
  const metrics = await PDFDocument.create();
  const regular = await metrics.embedFont(StandardFonts.TimesRoman);
  let nextRow = 7;
  for (const table of tables) {
    mergedText(sheet, nextRow++, table.columns.length, table.title, true);
    const header = sheet.getRow(nextRow++);
    header.values = table.columns.map(column => column.label);
    header.height = 58;
    header.eachCell(cell => {
      cell.font = { ...font, bold: true };
      cell.border = { top: border, right: border, bottom: border, left: border };
      cell.alignment = { vertical: 'middle', wrapText: true, indent: 1 };
    });
    for (const [index, record] of table.rows.entries()) {
      const values = table.columns.map(column => column.value(record, index));
      const lines = values.map((value, i) => wrapReportText(reportCellText(value), regular, 11, sheet.getColumn(i + 1).width! * 4.7 - 12, true));
      const totalLines = Math.max(...lines.map(cell => cell.length));
      for (let offset = 0; offset < totalLines; offset += MAX_LINES) {
        const cells: ReportCell[] = values.map((value, i) => lines[i].length > MAX_LINES ? lines[i].slice(offset, offset + MAX_LINES).join('\n') : value);
        const row = sheet.getRow(nextRow++);
        row.values = cells;
        row.height = Math.max(28, Math.min(MAX_LINES, totalLines - offset) * 15.5 + 16);
        row.eachCell({ includeEmpty: true }, (cell, column) => {
          cell.font = font;
          cell.border = { top: border, right: border, bottom: border, left: border };
          cell.alignment = { vertical: 'middle', horizontal: typeof cells[column - 1] === 'number' ? 'right' : 'left', wrapText: true, indent: 1 };
          const format = table.columns[column - 1].numberFormat;
          if (format) cell.numFmt = format;
        });
      }
    }
    if (!table.rows.length) {
      mergedText(sheet, nextRow, table.columns.length, 'Tidak ada data untuk filter yang dipilih.');
      for (let column = 1; column <= table.columns.length; column += 1) sheet.getCell(nextRow, column).border = { top: border, right: border, bottom: border, left: border };
      nextRow++;
    }
    // Two blank rows separate the plain tables on the same sheet.
    nextRow += 2;
  }
  return workbook.xlsx.writeBuffer();
}
