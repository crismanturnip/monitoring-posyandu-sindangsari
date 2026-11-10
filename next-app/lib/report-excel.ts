import { Workbook, type Worksheet } from 'exceljs';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { REPORT_TITLE, reportDate, reportDateGroups, reportEntryFields, reportPeriodText, reportTimestamp } from './report-document';
import { wrapReportText } from './report-export';
import type { ReportFilters, ReportRow } from './reports';

const font = { name: 'Times New Roman', size: 12, color: { argb: 'FF000000' } };

function mergedText(sheet: Worksheet, row: number, first: number, last: number, text: string, size = 12, bold = false, horizontal: 'left' | 'center' | 'right' = 'left') {
  sheet.mergeCells(row, first, row, last);
  const cell = sheet.getCell(row, first);
  cell.value = text;
  cell.font = { ...font, size, bold };
  cell.alignment = { vertical: 'middle', horizontal, wrapText: true };
}

export async function createReportExcel(rows: ReportRow[], filters: ReportFilters, generatedBy: string, generatedAt = new Date()) {
  const workbook = new Workbook();
  workbook.creator = generatedBy;
  workbook.lastModifiedBy = generatedBy;
  workbook.created = generatedAt;
  workbook.modified = generatedAt;
  workbook.title = REPORT_TITLE;
  workbook.subject = reportPeriodText(filters);

  const sheet = workbook.addWorksheet('Laporan', {
    views: [{ showGridLines: false }],
    properties: { defaultRowHeight: 20.7 },
    pageSetup: {
      paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 1.18, right: 0.42, top: 0.56, bottom: 0.97, header: 0.2, footer: 0.2 },
      showGridLines: false, printTitlesRow: '1:5',
    },
  });
  sheet.columns = Array.from({ length: 12 }, (_, index) => ({ width: index < 2 ? 2.8 : index < 10 ? 8.5 : 4.5, style: { font } }));
  mergedText(sheet, 1, 1, 12, reportTimestamp(generatedAt), 10, false, 'right');
  sheet.getCell('A1').font = { ...font, size: 10, color: { argb: 'FF808080' } };
  sheet.getRow(1).height = 13;
  sheet.getRow(2).height = 32;
  mergedText(sheet, 3, 1, 10, REPORT_TITLE, 16, true, 'center');
  sheet.getRow(3).height = 23;
  mergedText(sheet, 4, 1, 10, reportPeriodText(filters), 12, false, 'center');
  sheet.getRow(4).height = 25;
  sheet.getRow(5).height = 22;

  // Size wrapped, merged cells with the same font metrics as the PDF.
  const metrics = await PDFDocument.create();
  const regular = await metrics.embedFont(StandardFonts.TimesRoman);
  let rowIndex = 6;
  let number = 0;
  for (const group of reportDateGroups(rows)) {
    sheet.getRow(rowIndex).height = 23;
    mergedText(sheet, rowIndex++, 1, 10, reportDate(group.date));
    for (const record of group.records) {
      number += 1;
      sheet.getCell(rowIndex, 2).value = `${number}.`;
      sheet.getCell(rowIndex, 2).alignment = { vertical: 'top', horizontal: 'left' };
      for (const [label, value] of reportEntryFields(record)) {
        const text = `${label} : ${value}`;
        const lines = wrapReportText(text, regular, 12, 389, true);
        for (let offset = 0; offset < lines.length; offset += 18) {
          const chunk = lines.slice(offset, offset + 18);
          mergedText(sheet, rowIndex, 3, 10, chunk.join('\n'));
          sheet.getRow(rowIndex).height = Math.max(20.7, chunk.length * 20.7);
          rowIndex += 1;
        }
      }
      sheet.getRow(rowIndex++).height = 20.7;
    }
    sheet.getRow(rowIndex++).height = 16;
  }
  if (rows.length === 0) mergedText(sheet, rowIndex++, 1, 10, 'Tidak ada data untuk filter yang dipilih.');
  sheet.pageSetup.printArea = `A1:L${rowIndex - 1}`;

  const data = workbook.addWorksheet('Data', {
    views: [{ state: 'frozen', ySplit: 6, showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:6' },
  });
  const widths = [7, 21, 18, 30, 27, 19, 15, 30, 55];
  data.columns = widths.map((width) => ({ width, style: { font, alignment: { vertical: 'top', wrapText: true } } }));
  mergedText(data, 1, 1, 9, reportTimestamp(generatedAt), 10, false, 'right');
  data.getCell('A1').font = { ...font, size: 10, color: { argb: 'FF808080' } };
  mergedText(data, 3, 1, 9, REPORT_TITLE, 16, true, 'center');
  data.getRow(3).height = 25;
  mergedText(data, 4, 1, 9, reportPeriodText(filters), 12, false, 'center');
  data.getRow(6).values = ['No', 'Tanggal', 'Kategori', 'Nama', 'Posyandu', 'Berat badan (kg)', 'TB (cm)', 'Hasil', 'Catatan'];
  data.getRow(6).height = 30;
  data.getRow(6).eachCell((cell) => {
    cell.font = { ...font, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  let index = 0;
  for (const group of reportDateGroups(rows)) {
    for (const record of group.records) {
      const row = data.addRow([++index, new Date(`${record.date}T00:00:00Z`), record.category, record.name, record.posyandu, record.weightKg ?? null, record.heightCm ?? null, record.result, record.notes]);
      row.getCell(2).numFmt = '[$-id-ID]d mmmm yyyy';
      row.getCell(6).numFmt = '0.##';
      row.getCell(7).numFmt = '0.##';
      row.height = Math.min(409, Math.max(30, ...[record.name, record.posyandu, record.result, record.notes].map((text, field) => wrapReportText(text, regular, 12, [175, 155, 175, 320][field], true).length * 17)));
      row.eachCell((cell) => { cell.border = { bottom: { style: 'hair', color: { argb: 'FFD9D9D9' } } }; });
    }
  }
  data.autoFilter = { from: 'A6', to: `I${Math.max(6, data.rowCount)}` };
  data.pageSetup.printArea = `A1:I${Math.max(6, data.rowCount)}`;
  return workbook.xlsx.writeBuffer();
}
