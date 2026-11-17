const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const ts = require('typescript');
const { Workbook } = require('exceljs');
const { PDFDocument, PDFRawStream, decodePDFRawStream } = require('pdf-lib');
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename,
  });
  module._compile(outputText, filename);
};
const { reportAge } = require('../lib/report-age.ts');
const { reportTables } = require('../lib/report-tables.ts');
const { createReportPdf } = require('../lib/report-export.ts');
const { createReportExcel } = require('../lib/report-excel.ts');
const { normalizeReportFilters } = require('../lib/reports.ts');
const { REPORT_TITLE } = require('../lib/report-document.ts');
const filters = normalizeReportFilters({ category: 'semua', period: 'custom', start: '2026-11-01', end: '2026-11-30' });
const generatedAt = new Date('2026-11-17T03:28:00Z');
const rows = [
  { id: 'baby', date: '2026-11-17', category: 'Bayi', name: 'Bayi Ny. Contoh', birthDate: '2026-11-17',
    nik: '0000000000000001', motherName: 'Ibu Contoh', motherNik: '0000000000000002', fatherName: 'Ayah Contoh', fatherNik: '0000000000000003',
    phone: '081234567890', gender: 'PEREMPUAN', posyandu: 'Posyandu Contoh', weightKg: 3.1, heightCm: 49.5, result: 'Pengukuran', notes: 'Catatan bayi',
    deliveryType: 'Normal', gestationalWeeks: 39 },
  { id: 'child', date: '2026-11-17', category: 'Balita', name: '=Nama Balita Contoh', birthDate: '2024-05-04',
    posyandu: 'Posyandu Contoh', weightKg: 10.5, heightCm: 80, result: 'Pengukuran', notes: 'Catatan balita', headCircumferenceCm: 48 },
  { id: 'mother', date: '2026-11-17', category: 'Ibu Hamil', name: 'Ibu Hamil Contoh', birthDate: '1998-05-14',
    husbandName: 'Suami Contoh', husbandNik: '0000000000000004', phone: '081234567891', posyandu: 'Posyandu Contoh',
    result: 'Kunjungan', notes: 'BB: 52.5 kg\nTB: 158 cm\nTD: 110/70 mmHg\nLiLA: 24.5 cm\nCatatan ibu' },
];
function pdfText(pdf) {
  return pdf.context.enumerateIndirectObjects().filter(([, value]) => value instanceof PDFRawStream)
    .map(([, value]) => Buffer.from(decodePDFRawStream(value).decode()).toString('latin1')).join('\n');
}
const hasPdfText = (content, value) => {
  if (content.includes(Buffer.from(value, 'latin1').toString('hex').toUpperCase())) return true;
  const text = [...content.matchAll(/<([0-9A-F]+)>\s*Tj/g)].map(match => Buffer.from(match[1], 'hex').toString('latin1')).join('');
  return text.replace(/\s+/g, '').includes(value.replace(/\s+/g, ''));
};

test('baby ages use days before a full month, calendar months and days afterward, and no decimals', () => {
  assert.equal(reportAge('2026-11-17', '2026-11-17'), '0 hari (baru lahir)');
  assert.equal(reportAge('2026-11-09', '2026-11-17'), '8 hari');
  assert.equal(reportAge('2026-10-17', '2026-11-17'), '1 bulan');
  assert.equal(reportAge('2026-09-12', '2026-11-17'), '2 bulan 5 hari');
  assert.equal(reportAge('2026-01-31', '2026-02-28'), '1 bulan');
  assert.equal(reportAge('2024-02-29', '2025-02-28'), '1 tahun');
  assert.equal(reportAge('2025-11-18', '2026-11-17'), '11 bulan 30 hari');
  assert.equal(reportAge('2025-11-17', '2026-11-17'), '1 tahun');
  assert.equal(reportAge('2026-11-18', '2026-11-17'), '—');
  assert.equal(reportAge('2026-02-30', '2026-11-17'), '—');
});

test('each category has its agreed columns without duplicate BB/PB or a record-type column', () => {
  const tables = reportTables(rows, filters);
  assert.deepEqual(tables.map(table => table.title), ['Bayi', 'Balita', 'Ibu Hamil']);
  assert(tables.every(table => table.rows.length === 1));
  for (const table of tables) assert(!table.columns.some(column => /jenis catatan|pemeriksaan/i.test(column.label)));
  assert.equal(tables[0].columns.filter(column => /^BB/.test(column.label)).length, 1);
  assert.equal(tables[0].columns.filter(column => /^PB/.test(column.label)).length, 1);
  for (const label of ['Nama ayah', 'NIK ayah', 'Nama ibu', 'NIK ibu', 'No. HP orang tua']) {
    assert(tables[0].columns.some(column => column.label === label));
    assert(tables[1].columns.some(column => column.label === label));
  }
  assert(tables[2].columns.some(column => column.label === 'Nama suami'));
});

function section(sheet, title) {
  let heading;
  sheet.eachRow((row, index) => { if (row.getCell(1).value === title) heading = index; });
  assert(heading, 'Missing section ' + title);
  return { header: sheet.getRow(heading + 1), firstRow: sheet.getRow(heading + 2) };
}
function sectionCell(sheet, title, label) {
  const { header, firstRow } = section(sheet, title);
  const index = header.values.indexOf(label);
  assert(index > 0, 'Missing column ' + label);
  return firstRow.getCell(index);
}

test('Excel contains one normal sheet with three plain tables and no frozen panes or filters', async () => {
  const workbook = new Workbook();
  const bytes = await createReportExcel(rows, filters, 'Petugas Contoh', generatedAt);
  await workbook.xlsx.load(bytes);
  assert.deepEqual(workbook.worksheets.map(sheet => sheet.name), ['Laporan']);
  const sheet = workbook.getWorksheet('Laporan');
  assert.equal(sectionCell(sheet, 'Bayi', 'Umur').value, '0 hari (baru lahir)');
  assert.equal(sectionCell(sheet, 'Bayi', 'NIK bayi').value, '0000000000000001');
  assert.equal(sectionCell(sheet, 'Bayi', 'No. HP orang tua').value, '081234567890');
  assert.equal(sectionCell(sheet, 'Bayi', 'BB (kg)').value, 3.1);
  assert.equal(sectionCell(sheet, 'Bayi', 'PB (cm)').value, 49.5);
  assert(sectionCell(sheet, 'Bayi', 'Tanggal').value instanceof Date);
  assert.equal(sectionCell(sheet, 'Ibu Hamil', 'BB (kg)').value, 52.5);
  assert.equal(sectionCell(sheet, 'Ibu Hamil', 'LiLA (cm)').value, 24.5);
  assert.equal(sectionCell(sheet, 'Ibu Hamil', 'Tekanan darah (mmHg)').value, '110/70');
  assert.equal(sectionCell(sheet, 'Balita', 'Nama balita').value, '=Nama Balita Contoh');
  assert.equal(sectionCell(sheet, 'Balita', 'Nama balita').formula, undefined);
  assert.equal(sectionCell(sheet, 'Balita', 'Nama ayah').value, '\u2014');
  assert.equal(sheet.views[0].state, 'normal');
  assert(!sheet.views[0].xSplit && !sheet.views[0].ySplit);
  assert(!sheet.autoFilter);
  assert(!sheet.pageSetup.printTitlesRow);
  const zip = await require('jszip').loadAsync(bytes);
  const xml = await zip.file('xl/worksheets/sheet1.xml').async('string');
  assert(!xml.includes('<pane'), 'Excel still contains a frozen or split pane');
  assert(!xml.includes('<autoFilter'), 'Excel still contains filter controls');
  for (const title of ['Bayi', 'Balita', 'Ibu Hamil']) {
    const { header, firstRow } = section(sheet, title);
    assert(firstRow.height >= 28);
    assert.equal(header.getCell(1).fill.pattern, 'none');
    firstRow.eachCell(value => {
      for (const side of ['left', 'right', 'top', 'bottom']) assert.equal(value.border[side].style, 'thin');
      assert.equal(value.alignment.wrapText, true);
      assert(!value.font.bold);
    });
  }
});

test('PDF uses landscape A3 tables and includes every category, parent/contact value, and newborn age', async () => {
  const pdf = await PDFDocument.load(await createReportPdf(rows, filters, 'Petugas Contoh', generatedAt));
  const content = pdfText(pdf);
  assert.equal(pdf.getPageCount(), 1);
  assert.equal(pdf.getPage(0).getWidth(), 1190.55);
  assert.equal(pdf.getPage(0).getHeight(), 841.89);
  for (const value of [REPORT_TITLE, '0 hari (baru lahir)', 'Nama ayah', 'NIK ayah', 'Nama suami', '081234567890', '0000000000000001', 'Catatan bayi', 'Catatan balita', 'Catatan ibu']) {
    assert(hasPdfText(content, value), `Missing PDF text: ${value}`);
  }
  assert((content.match(/\nS\n/g) ?? []).length > 100, 'Cell borders were not drawn');
  assert(content.includes('/Times-Roman') && content.includes('/Times-Bold'));
});

test('long notes continue across boxed rows/pages without losing the end or overflowing Excel row height', async () => {
  const notes = 'Catatan lengkap yang perlu dipertahankan. '.repeat(200) + '\nPENUTUP-CATATAN';
  const records = [{ ...rows[0], notes }];
  const selected = { ...filters, category: 'bayi' };
  const pdf = await PDFDocument.load(await createReportPdf(records, selected, 'Petugas Contoh', generatedAt));
  assert(pdf.getPageCount() > 1);
  assert(hasPdfText(pdfText(pdf), 'PENUTUP-CATATAN'));
  for (const page of pdf.getPages()) {
    const pageContent = page.node.Contents().asArray().map(ref => Buffer.from(decodePDFRawStream(pdf.context.lookup(ref)).decode()).toString('latin1')).join('\n');
    assert(hasPdfText(pageContent, 'Nama ayah'), 'Continuation page lost the table header');
  }
  const workbook = new Workbook();
  await workbook.xlsx.load(await createReportExcel(records, selected, 'Petugas Contoh', generatedAt));
  const sheet = workbook.getWorksheet('Laporan');
  const { header } = section(sheet, 'Bayi');
  const noteColumn = header.values.indexOf('Catatan');
  let combined = '';
  sheet.eachRow((row, index) => { assert(row.height <= 409); if (index > header.number) combined += row.getCell(noteColumn).text; });
  assert(combined.replace(/\s+/g, '').includes('PENUTUP-CATATAN'));
});

test('empty reports retain the three category headers and show no invented patient rows', async () => {
  const pdf = await PDFDocument.load(await createReportPdf([], filters, 'Petugas Contoh', generatedAt));
  assert.equal(pdf.getPageCount(), 1);
  assert(hasPdfText(pdfText(pdf), 'Tidak ada data untuk filter yang dipilih.'));
  const workbook = new Workbook();
  await workbook.xlsx.load(await createReportExcel([], filters, 'Petugas Contoh', generatedAt));
  assert.equal(workbook.worksheets.length, 1);
  const sheet = workbook.getWorksheet('Laporan');
  for (const title of ['Bayi', 'Balita', 'Ibu Hamil']) {
    assert.equal(section(sheet, title).firstRow.getCell(1).value, 'Tidak ada data untuk filter yang dipilih.');
  }
});

test('combined downloads retain records beyond a screen page and individual-category downloads contain only their table', async () => {
  const records = rows.flatMap(row => Array.from({ length: 21 }, (_, index) => ({
    ...row, id: `${row.id}-${index}`, name: `${row.category} contoh ${index}`, notes: '',
  })));
  const workbook = new Workbook();
  await workbook.xlsx.load(await createReportExcel(records, filters, 'Petugas Contoh', generatedAt));
  const sheet = workbook.getWorksheet('Laporan');
  const names = [];
  sheet.eachRow(row => { if (typeof row.getCell(3).value === 'string') names.push(row.getCell(3).value); });
  for (const record of records) assert.equal(names.filter(name => name === record.name).length, 1, record.name);
  const pdf = await PDFDocument.load(await createReportPdf(records, filters, 'Petugas Contoh', generatedAt));
  const content = pdfText(pdf);
  for (const record of records) assert(hasPdfText(content, record.name), record.name);
  for (const [category, title] of [['bayi', 'Bayi'], ['balita', 'Balita'], ['ibu-hamil', 'Ibu Hamil']]) {
    const selected = { ...filters, category };
    const selectedBook = new Workbook();
    await selectedBook.xlsx.load(await createReportExcel(rows.filter(row => row.category === title), selected, 'Petugas Contoh', generatedAt));
    assert.equal(selectedBook.worksheets.length, 1);
    const titles = [];
    selectedBook.worksheets[0].eachRow(row => { if (['Bayi', 'Balita', 'Ibu Hamil'].includes(row.getCell(1).value)) titles.push(row.getCell(1).value); });
    assert.deepEqual(titles, [title]);
  }
});
