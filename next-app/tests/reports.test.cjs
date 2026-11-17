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
const { REPORT_TITLE, reportTimestamp, reportPeriodText } = require('../lib/report-document.ts');
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
    const source = sources[table] ?? { date: 'created_at', relation: null };
    const parent = !source.relation;
    assert(source.relation || ['children', 'pregnant_mothers', 'elderly_people'].includes(table), `Unexpected table: ${table}`);
    const dates = table === 'child_measurements' ? ['2026-10-20', '2026-11-04']
      : table === 'pregnancy_visits' ? ['2026-10-01', '2026-11-09'] : ['2026-09-01', '2026-11-05'];
    let records = empty || parent ? [] : dates.map((date, index) => ({
      id: `record-${index}`, [source.date]: date, weight_kg: 10, height_cm: 80, officer_notes: `Catatan ${table}`,
      [source.relation]: { id: `person-${index}`, birth_date: '2025-01-01', name: `Contoh ${source.relation}`, posyandu_id: 'pos-a', posyandu: { name: 'Pos A' } },
    }));
    if (!empty && table === 'child_measurements') records.push({ id: 'newborn', measured_at: '2026-11-08', weight_kg: 3.1, height_cm: 49.5, officer_notes: 'Bayi baru lahir', children: { id: 'newborn-child', birth_date: '2026-11-08', name: 'Bayi Contoh', posyandu_id: 'pos-a', posyandu: { name: 'Pos A' } } });
    if (!empty && !parent) records.push({ id: 'other-pos', [source.date]: '2025-01-01', [source.relation]: { id: 'other-person', birth_date: '2025-01-01', name: 'Pos lain', posyandu_id: 'pos-b', posyandu: { name: 'Pos B' } } });
    let ascending = true, limit = Infinity, offset = 0, count = false;
    const query = {
      select(columns, options = {}) { if (!parent) assert(columns.includes(`${source.relation}!inner`)); count = options.count === 'exact'; return query; },
      eq(path, value) { assert.equal(path, parent ? 'posyandu_id' : `${source.relation}.posyandu_id`); records = records.filter(row => (parent ? row : row[source.relation]).posyandu_id === value); return query; },
      is(path, value) { assert.equal(path, parent ? 'deleted_at' : `${source.relation}.deleted_at`); assert.equal(value, null); return query; },
      gte(column, value) { assert.equal(column, source.date); records = records.filter(row => row[column] >= value); return query; },
      lte(column, value) { assert.equal(column, source.date); records = records.filter(row => row[column] <= value); return query; },
      order(column, options) { if (column !== 'id') { assert.equal(column, source.date); ascending = options.ascending; } return query; },
      limit(value) { limit = value; return query; },
      range(from, to) { offset = from; limit = to - from + 1; return query; },
      then(resolve, reject) {
        const data = [...records].sort((a, b) => (ascending ? 1 : -1) * a[source.date].localeCompare(b[source.date])).slice(offset, offset + limit);
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
    ['Ibu Hamil', '2026-11-09'], ['Bayi', '2026-11-08'], ['Balita', '2026-11-04'],
  ]);
  assert(report.rows.every(row => row.posyandu === 'Pos A'));
  assert.equal(new Set(report.rows.map(row => `${row.category}:${row.id}`)).size, 3);
});

test('individual categories still work and combined empty ranges expose all available dates', async () => {
  const client = mockClient();
  for (const [category, label] of [['bayi', 'Bayi'], ['balita', 'Balita'], ['ibu-hamil', 'Ibu Hamil'], ['lansia', 'Lansia']]) {
    const report = await loadReportRows(client, { ...allFilters(), category });
    assert.equal(report.rows.length, 1);
    assert.equal(report.rows[0].category, label);
  }
  const filters = { ...allFilters(), startDate: '2026-08-01', endDate: '2026-08-31' };
  assert.equal((await loadReportRows(client, filters)).rows.length, 0);
  const availability = await loadReportAvailability(client, filters);
  assert.deepEqual(availability, { count: 5, startDate: '2026-10-01', endDate: '2026-11-09', error: null });
  const restored = normalizeReportFilters({ category: 'semua', period: 'custom', posyandu: 'pos-a', start: availability.startDate, end: availability.endDate });
  assert.equal((await loadReportRows(client, restored)).rows.length, 5);
});

test('empty, reversed-date, and failed-category reports are handled without partial totals', async () => {
  assert.deepEqual(await loadReportRows(mockClient({ empty: true }), allFilters()), { rows: [], error: null });
  assert.deepEqual(await loadReportAvailability(mockClient({ empty: true }), allFilters()), { count: 0, startDate: null, endDate: null, error: null });
  const reversed = await loadReportRows(mockClient(), { ...allFilters(), startDate: '2026-11-11' });
  assert(reversed.error);
  const failed = await loadReportRows(mockClient({ failingTable: 'pregnancy_visits' }), allFilters());
  assert(failed.error.includes('Ibu Hamil'));
  assert.equal(failed.rows.length, 0);
  assert((await loadReportAvailability(mockClient({ failingTable: 'pregnancy_visits' }), allFilters())).error);
});

function pdfContent(pdf) {
  return pdf.context.enumerateIndirectObjects().filter(([, value]) => value instanceof PDFRawStream)
    .map(([, value]) => Buffer.from(decodePDFRawStream(value).decode()).toString('latin1')).join('\n');
}

const pdfContains = (content, text) => content.includes(Buffer.from(text, 'latin1').toString('hex').toUpperCase());

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
