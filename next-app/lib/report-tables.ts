import { reportAge } from './report-age';
import type { ReportFilters, ReportRow } from './reports';

export type ReportCell = string | number | Date;
export type ReportColumn = {
  label: string; width: number; numberFormat?: string;
  value: (row: ReportRow, index: number) => ReportCell;
};
export type ReportTable = { key: string; title: string; columns: ReportColumn[]; rows: ReportRow[] };
export const REPORT_EMPTY = '—';
const show = (value: unknown): string => value === undefined || value === null || value === '' || value === '-' ? REPORT_EMPTY : String(value);

function clinical(row: ReportRow, label: string): string | undefined {
  return row.notes.match(new RegExp(`(?:^|\\n| • )${label}:\\s*([^\\n•]+)`, 'i'))?.[1]?.trim();
}
function clinicalNumber(row: ReportRow, label: string) {
  const value = clinical(row, label)?.match(/^\d+(?:[.,]\d+)?/)?.[0];
  return value ? Number(value.replace(',', '.')) : undefined;
}
const field = (label: string, key: keyof ReportRow, width: number): ReportColumn => ({ label, width, value: row => show(row[key]) });
const numeric = (label: string, width: number, get: (row: ReportRow) => number | undefined): ReportColumn => ({
  label, width, numberFormat: '0.##', value: row => get(row) ?? REPORT_EMPTY,
});
const dateColumn = (label: string, get: (row: ReportRow) => string | undefined): ReportColumn => ({
  label, width: 58, numberFormat: '[$-id-ID]dd/mm/yyyy',
  value: row => { const value = get(row); return value ? new Date(`${value}T00:00:00Z`) : REPORT_EMPTY; },
});
const start: ReportColumn[] = [
  { label: 'No.', width: 26, value: (_row, index) => index + 1 },
  dateColumn('Tanggal', row => row.date),
];
const finish: ReportColumn[] = [field('Catatan', 'notes', 88)];
const contact: ReportColumn[] = [field('No. HP orang tua', 'phone', 74), field('Posyandu', 'posyandu', 62)];

function childColumns(baby: boolean): ReportColumn[] {
  return [
    ...start,
    field(baby ? 'Nama bayi' : 'Nama balita', 'name', 66),
    field(baby ? 'NIK bayi' : 'NIK balita', 'nik', 85),
    dateColumn('Tanggal lahir', row => row.birthDate),
    { label: 'Umur', width: 64, value: row => reportAge(row.birthDate, row.date) },
    { label: 'Jenis kelamin', width: 57, value: row => row.gender === 'LAKI_LAKI' ? 'Laki-laki' : row.gender === 'PEREMPUAN' ? 'Perempuan' : show(row.gender) },
    field('Nama ibu', 'motherName', 63), field('NIK ibu', 'motherNik', 85),
    field('Nama ayah', 'fatherName', 63), field('NIK ayah', 'fatherNik', 85),
    ...contact,
    numeric(baby ? 'Berat Badan Lahir (kg)' : 'BB (kg)', 38, row => baby ? row.birthWeightKg : row.weightKg),
    numeric(baby ? 'Panjang Badan Lahir (cm)' : 'TB (cm)', 38, row => baby ? row.birthLengthCm : row.heightCm),
    ...(baby ? [field('Keterangan kelahiran', 'deliveryType', 58), numeric('Usia kehamilan saat lahir (minggu)', 68, row => row.gestationalWeeks)]
      : [numeric('Lingkar kepala (cm)', 58, row => row.headCircumferenceCm), numeric('LiLA jika diukur (cm)', 52, row => row.lilaCm)]),
    field('Catatan', 'notes', baby ? 80 : 96),
  ];
}

const motherColumns: ReportColumn[] = [
  ...start, field('Nama ibu', 'name', 90), field('NIK ibu', 'nik', 90),
  dateColumn('Tanggal lahir', row => row.birthDate),
  { label: 'Umur', width: 65, value: row => reportAge(row.birthDate, row.date, false) },
  field('Nama suami', 'husbandName', 90), field('NIK suami', 'husbandNik', 90),
  field('No. HP ibu/keluarga', 'phone', 80), field('Posyandu', 'posyandu', 80),
  numeric('Usia kehamilan (minggu)', 65, row => row.gestationalWeeks),
  numeric('BB (kg)', 48, row => row.weightKg ?? clinicalNumber(row, 'BB')),
  numeric('TB (cm)', 48, row => row.heightCm ?? clinicalNumber(row, 'TB')),
  { label: 'Tekanan darah (mmHg)', width: 78, value: row => show(row.bloodPressure ?? clinical(row, 'TD')?.replace(/\s*mmHg$/i, '')) },
  numeric('LiLA (cm)', 48, row => row.lilaCm ?? clinicalNumber(row, 'LiLA')),
  ...finish,
];

export function reportTables(rows: ReportRow[], filters: ReportFilters): ReportTable[] {
  const definitions = [
    { key: 'bayi', title: 'Bayi', columns: childColumns(true), matches: (row: ReportRow) => row.category === 'Bayi' },
    { key: 'balita', title: 'Balita', columns: childColumns(false), matches: (row: ReportRow) => ['Balita', 'Bayi/Balita'].includes(row.category) },
    { key: 'ibu-hamil', title: 'Ibu Hamil', columns: motherColumns, matches: (row: ReportRow) => row.category === 'Ibu Hamil' },
    { key: 'lansia', title: 'Lansia', columns: [...start, field('Nama lansia', 'name', 130), field('Posyandu', 'posyandu', 120), field('Hasil', 'result', 140), field('Catatan', 'notes', 260)], matches: (row: ReportRow) => row.category === 'Lansia' },
  ];
  return definitions.filter(item => filters.category === 'semua' ? item.key !== 'lansia' : item.key === filters.category)
    .map(item => ({ key: item.key, title: item.title, columns: item.columns,
      rows: rows.filter(item.matches).sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id)),
    }));
}

export function reportTablePages(rows: ReportRow[], filters: ReportFilters, params: Record<string, string | undefined>, pageSize = 10) {
  return reportTables(rows, filters).map(table => {
    const newestFirst = [...table.rows].sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
    const pageParam = `page_${table.key}`;
    const total = newestFirst.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(totalPages, Math.max(1, Number.parseInt(params[pageParam] ?? '1', 10) || 1));
    const offset = (page - 1) * pageSize;
    return { ...table, total, totalPages, page, pageParam, offset, rows: newestFirst.slice(offset, offset + pageSize) };
  });
}

export function reportCellText(value: ReportCell) {
  if (value instanceof Date) return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(value);
  return typeof value === 'number' ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value) : value;
}
