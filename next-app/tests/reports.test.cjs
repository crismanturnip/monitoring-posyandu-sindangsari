const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const ts = require('typescript');
const { PDFDocument, PDFRawStream, decodePDFRawStream } = require('pdf-lib');
const { Workbook } = require('exceljs');

// Run the application TypeScript with the installed compiler, without extra test dependencies.
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const { reportDateRange } = require('../lib/report-periods.ts');
const { normalizeReportFilters, loadReportRows, loadReportAvailability, reportFilename } = require('../lib/reports.ts');
const { createReportPdf } = require('../lib/report-export.ts');
const { createReportExcel } = require('../lib/report-excel.ts');
const { REPORT_TITLE, reportTimestamp, reportPeriodText, reportEntryFields } = require('../lib/report-document.ts');
const generatedAt = new Date('2026-11-16T03:28:00Z');

test('daily and weekly periods include the end date, across years and leap days', () => {
  assert.deepEqual(reportDateRange('1-hari', '2026-11-10'), { startDate: '2026-11-10', endDate: '2026-11-10' });
  assert.equal(reportDateRange('1-minggu', '2026-11-10').startDate, '2026-11-04');
  assert.equal(reportDateRange('1-minggu', '2026-01-03').startDate, '2025-12-28');
  assert.equal(reportDateRange('1-minggu', '2024-03-02').startDate, '2024-02-25');
});

test('monthly periods handle shorter months, leap years, and year boundaries', () => {
  assert.equal(reportDateRange('1-bulan', '2026-11-10').startDate, '2026-10-11');
  assert.equal(reportDateRange('3-bulan', '2026-11-10').startDate, '2026-08-11');
  assert.equal(reportDateRange('1-bulan', '2026-03-31').startDate, '2026-03-01');
  assert.equal(reportDateRange('1-bulan', '2024-03-31').startDate, '2024-03-01');
  assert.equal(reportDateRange('3-bulan', '2026-01-31').startDate, '2025-11-01');
});

test('default category is all and preset filters survive export URL round trips', () => {
  const defaults = normalizeReportFilters({});
  assert.equal(defaults.category, 'semua');
  assert.equal(defaults.period, '1-bulan');
  for (const period of ['1-hari', '1-minggu', '1-bulan', '3-bulan']) {
    const filters = normalizeReportFilters({ category: 'semua', period, posyandu: 'pos-a', start: '2000-01-01', end: '2026-11-10' });
    assert.deepEqual({ startDate: filters.startDate, endDate: filters.endDate }, reportDateRange(period, '2026-11-10'));
    const query = new URLSearchParams({ category: filters.category, period: filters.period, posyandu: filters.posyanduId, start: filters.startDate, end: filters.endDate });
    assert.deepEqual(normalizeReportFilters(Object.fromEntries(query)), filters);
    assert.equal(reportFilename('xlsx', generatedAt), 'Laporan Data Posyandu Sindang Sari - Generate 16 November 2026.xlsx');
  }
});

test('custom and existing date links preserve their exact range; invalid dates fall back safely', () => {
  for (const period of [undefined, 'custom']) {
    const filters = normalizeReportFilters({ category: 'balita', period, start: '2026-10-02', end: '2026-10-15' });
    assert.equal(filters.period, 'custom');
    assert.equal(filters.startDate, '2026-10-02');
    assert.equal(filters.endDate, '2026-10-15');
  }
  const invalid = normalizeReportFilters({ category: 'unknown', period: '__proto__', start: '2026-02-30', end: '2026-11-10' });
  assert.equal(invalid.category, 'semua');
  assert.equal(invalid.startDate, '2026-11-01');
});

const sources = {
  child_measurements: { date: 'measured_at', relation: 'children' },
  pregnancy_visits: { date: 'visited_at', relation: 'pregnant_mothers' },
  elderly_examinations: { date: 'examined_at', relation: 'elderly_people' },
};

function mockClient({ failingTable, empty = false } = {}) {
  return { from(table) {
    const source = sources[table];
    assert(source, `Unexpected table: ${table}`);
    const dates = table === 'child_measurements' ? ['2026-10-20', '2026-11-04']
      : table === 'pregnancy_visits' ? ['2026-10-01', '2026-11-09'] : ['2026-09-01', '2026-11-05'];
    let records = empty ? [] : dates.map((date, index) => ({
      id: `record-${index}`, [source.date]: date, weight_kg: 10, height_cm: 80, officer_notes: `Catatan ${table}`,
      [source.relation]: { name: `Contoh ${source.relation}`, posyandu_id: 'pos-a', posyandu: { name: 'Pos A' } },
    }));
    if (!empty) records.push({ id: 'other-pos', [source.date]: '2025-01-01', [source.relation]: { name: 'Pos lain', posyandu_id: 'pos-b', posyandu: { name: 'Pos B' } } });
    let ascending = true, limit = Infinity, count = false;
    const query = {
      select(columns, options = {}) { assert(columns.includes(`${source.relation}!inner`)); count = options.count === 'exact'; return query; },
      eq(path, value) { assert.equal(path, `${source.relation}.posyandu_id`); records = records.filter(row => row[source.relation].posyandu_id === value); return query; },
      gte(column, value) { assert.equal(column, source.date); records = records.filter(row => row[column] >= value); return query; },
      lte(column, value) { assert.equal(column, source.date); records = records.filter(row => row[column] <= value); return query; },
      order(column, options) { assert.equal(column, source.date); ascending = options.ascending; return query; },
      limit(value) { limit = value; return query; },
      then(resolve, reject) {
        const data = [...records].sort((a, b) => (ascending ? 1 : -1) * a[source.date].localeCompare(b[source.date])).slice(0, limit);
        return Promise.resolve(table === failingTable ? { data: null, count: null, error: { message: 'Database unavailable' } } : { data, count: count ? records.length : null, error: null }).then(resolve, reject);
      },
    };
    return query;
  } };
}

const allFilters = () => normalizeReportFilters({ category: 'semua', period: 'custom', posyandu: 'pos-a', start: '2026-11-01', end: '2026-11-10' });

test('all categories combine into date order, keeping date and Posyandu filters', async () => {
  const report = await loadReportRows(mockClient(), allFilters());
  assert.equal(report.error, null);
  assert.deepEqual(report.rows.map(row => [row.category, row.date]), [
    ['Ibu Hamil', '2026-11-09'], ['Lansia', '2026-11-05'], ['Bayi/Balita', '2026-11-04'],
  ]);
  assert(report.rows.every(row => row.posyandu === 'Pos A'));
  assert.equal(new Set(report.rows.map(row => `${row.category}:${row.id}`)).size, 3);
});

test('individual categories still work and combined empty ranges expose all available dates', async () => {
  const client = mockClient();
  for (const [category, label] of [['balita', 'Bayi/Balita'], ['ibu-hamil', 'Ibu Hamil'], ['lansia', 'Lansia']]) {
    const report = await loadReportRows(client, { ...allFilters(), category });
    assert.equal(report.rows.length, 1);
    assert.equal(report.rows[0].category, label);
  }
  const filters = { ...allFilters(), startDate: '2026-08-01', endDate: '2026-08-31' };
  assert.equal((await loadReportRows(client, filters)).rows.length, 0);
  const availability = await loadReportAvailability(client, filters);
  assert.deepEqual(availability, { count: 6, startDate: '2026-09-01', endDate: '2026-11-09', error: null });
  const restored = normalizeReportFilters({ category: 'semua', period: 'custom', posyandu: 'pos-a', start: availability.startDate, end: availability.endDate });
  assert.equal((await loadReportRows(client, restored)).rows.length, 6);
});

test('empty, reversed-date, and failed-category reports are handled without partial totals', async () => {
  assert.deepEqual(await loadReportRows(mockClient({ empty: true }), allFilters()), { rows: [], error: null });
  assert.deepEqual(await loadReportAvailability(mockClient({ empty: true }), allFilters()), { count: 0, startDate: null, endDate: null, error: null });
  const reversed = await loadReportRows(mockClient(), { ...allFilters(), startDate: '2026-11-11' });
  assert(reversed.error);
  const failed = await loadReportRows(mockClient({ failingTable: 'pregnancy_visits' }), allFilters());
  assert(failed.error.includes('ibu hamil'));
  assert.equal(failed.rows.length, 0);
  assert((await loadReportAvailability(mockClient({ failingTable: 'pregnancy_visits' }), allFilters())).error);
});

function pdfContent(pdf) {
  return pdf.context.enumerateIndirectObjects().filter(([, value]) => value instanceof PDFRawStream)
    .map(([, value]) => Buffer.from(decodePDFRawStream(value).decode()).toString('latin1')).join('\n');
}

const pdfContains = (content, text) => content.includes(Buffer.from(text, 'latin1').toString('hex').toUpperCase());

test('PDF follows the reference typography, includes all records, and uses the selected period and creation time', async () => {
  const filters = allFilters();
  const { rows } = await loadReportRows(mockClient(), filters);
  const pdf = await PDFDocument.load(await createReportPdf(rows, filters, 'Petugas Contoh', generatedAt));
  const content = pdfContent(pdf);
  for (const row of rows) {
    for (const [, value] of reportEntryFields(row)) assert(pdfContains(content, value), `Missing PDF value: ${value}`);
  }
  assert(pdfContains(content, REPORT_TITLE));
  assert(pdfContains(content, 'Data terakhir : 16 November 2026, 10.28 WIB'));
  assert(pdfContains(content, 'Periode : 1 November 2026 s.d. 10 November 2026'));
  assert.equal(pdf.getTitle(), REPORT_TITLE);
  assert.equal(pdf.getCreationDate().toISOString(), generatedAt.toISOString());
  assert.equal(pdf.getPage(0).getWidth(), 595.28);
  assert.equal(pdf.getPage(0).getHeight(), 841.89);
  assert(content.includes('/Times-Roman') && content.includes('/Times-Bold'));
});

test('generation date and time use WIB, while every period retains its own dates', () => {
  const midnightWib = new Date('2026-11-15T17:05:00Z');
  assert.equal(reportFilename('pdf', midnightWib), 'Laporan Data Posyandu Sindang Sari - Generate 16 November 2026.pdf');
  assert.equal(reportTimestamp(midnightWib), 'Data terakhir : 16 November 2026, 00.05 WIB');
  for (const [period, label] of [['1-hari', '1 hari'], ['1-minggu', '1 minggu'], ['1-bulan', '1 bulan'], ['3-bulan', '3 bulan']]) {
    const filters = normalizeReportFilters({ category: 'semua', period, end: '2026-11-10' });
    assert(reportPeriodText(filters).startsWith(`Periode : ${label} (`));
    assert(reportPeriodText(filters).includes('10 November 2026'));
  }
  assert.equal(reportPeriodText(normalizeReportFilters({ period: '1-hari', end: '2026-11-10' })), 'Periode : 1 hari (10 November 2026)');
});

test('Excel round trips with a formatted reference sheet and filterable typed data', async () => {
  const filters = allFilters();
  const { rows } = await loadReportRows(mockClient(), filters);
  const bytes = await createReportExcel(rows, filters, 'Petugas Contoh', generatedAt);
  assert.equal(Buffer.from(bytes).subarray(0, 2).toString(), 'PK');
  const workbook = new Workbook();
  await workbook.xlsx.load(bytes);
  assert.deepEqual(workbook.worksheets.map(sheet => sheet.name), ['Laporan', 'Data']);
  assert.equal(workbook.creator, 'Petugas Contoh');
  assert.equal(workbook.created.toISOString(), generatedAt.toISOString());
  const sheet = workbook.getWorksheet('Laporan');
  assert.equal(sheet.getCell('A1').value, 'Data terakhir : 16 November 2026, 10.28 WIB');
  assert.equal(sheet.getCell('A1').alignment.horizontal, 'right');
  assert.equal(sheet.getCell('A3').value, REPORT_TITLE);
  assert.equal(sheet.getCell('A3').font.name, 'Times New Roman');
  assert.equal(sheet.getCell('A3').font.size, 16);
  assert.equal(sheet.getCell('A3').font.bold, true);
  assert.equal(sheet.getCell('A3').alignment.horizontal, 'center');
  assert.equal(sheet.getCell('A4').value, reportPeriodText(filters));
  assert.equal(sheet.getCell('A6').value, '4 November 2026');
  assert.equal(sheet.getCell('B7').value, '1.');
  assert.equal(sheet.getCell('C7').value, 'Nama : Contoh children');
  assert.equal(sheet.getCell('C10').value, 'Berat badan : 10 kg');
  assert.equal(sheet.getCell('C11').value, 'TB : 80 cm');
  assert.equal(sheet.pageSetup.paperSize, 9);
  assert.equal(sheet.pageSetup.orientation, 'portrait');
  assert.equal(sheet.pageSetup.fitToWidth, 1);
  assert.equal(sheet.views[0].showGridLines, false);
  const data = workbook.getWorksheet('Data');
  assert.equal(data.rowCount, 9);
  assert.equal(data.autoFilter, 'A6:I9');
  assert.equal(data.views[0].ySplit, 6);
  assert.equal(data.getCell('B7').value.toISOString(), '2026-11-04T00:00:00.000Z');
  assert.equal(data.getCell('F7').value, 10);
  assert.equal(data.getCell('G7').value, 80);
  for (let i = 7; i <= 9; i++) assert.equal(data.getCell(`E${i}`).value, 'Pos A');
});

test('long multiline notes are retained across PDF pages and Excel rows without oversized rows or formulas', async () => {
  const filters = allFilters();
  const notes = 'Catatan pemeriksaan lengkap. '.repeat(250) + '\nPENUTUP-CATATAN';
  const rows = [{ id: 'long', date: '2026-11-04', category: 'Bayi/Balita', name: '=Contoh warga', posyandu: 'Pos A', weightKg: 10.5, heightCm: 80, result: 'Pengukuran', notes }];
  const pdf = await PDFDocument.load(await createReportPdf(rows, filters, 'Petugas Contoh', generatedAt));
  assert(pdf.getPageCount() > 1);
  assert(pdfContains(pdfContent(pdf), 'PENUTUP-CATATAN'));
  assert(pdfContains(pdfContent(pdf), 'Berat badan : 10,5 kg'));
  for (const page of pdf.getPages()) {
    const pageContent = page.node.Contents().asArray().map(ref => Buffer.from(decodePDFRawStream(pdf.context.lookup(ref)).decode()).toString('latin1')).join('\n');
    assert(pdfContains(pageContent, REPORT_TITLE));
  }
  const workbook = new Workbook();
  await workbook.xlsx.load(await createReportExcel(rows, filters, 'Petugas Contoh', generatedAt));
  const sheet = workbook.getWorksheet('Laporan');
  let foundEnd = false;
  sheet.eachRow(row => {
    assert(row.height <= 409);
    if (String(row.getCell(3).value).includes('PENUTUP-CATATAN')) foundEnd = true;
  });
  assert(foundEnd);
  const data = workbook.getWorksheet('Data');
  assert.equal(data.getCell('I7').value, notes);
  assert.equal(data.getCell('D7').value, '=Contoh warga');
  assert.equal(data.getCell('D7').formula, undefined);
  assert.equal(data.getCell('F7').value, 10.5);
});

test('empty PDF and Excel reports retain their metadata without fabricated records', async () => {
  const pdf = await PDFDocument.load(await createReportPdf([], allFilters(), 'Petugas Contoh', generatedAt));
  assert.equal(pdf.getPageCount(), 1);
  assert(pdfContains(pdfContent(pdf), 'Tidak ada data untuk filter yang dipilih.'));
  const workbook = new Workbook();
  await workbook.xlsx.load(await createReportExcel([], allFilters(), 'Petugas Contoh', generatedAt));
  assert.equal(workbook.getWorksheet('Data').rowCount, 6);
  assert.equal(workbook.getWorksheet('Laporan').getCell('A6').value, 'Tidak ada data untuk filter yang dipilih.');
});
