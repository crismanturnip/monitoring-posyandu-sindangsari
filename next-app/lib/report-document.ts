import { reportPeriodLabels } from './report-periods';
import type { ReportFilters, ReportRow } from './reports';

export const REPORT_TITLE = 'Laporan Data Posyandu Desa Sindang Sari';
const timeZone = 'Asia/Jakarta';
const dateFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone });
const timeFormat = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone });
const numberFormat = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });

export const reportDate = (value: string) => dateFormat.format(new Date(`${value}T00:00:00+07:00`));
export const reportGeneratedDate = (generatedAt: Date) => dateFormat.format(generatedAt);
export const reportTimestamp = (generatedAt: Date) => `Data terakhir : ${reportGeneratedDate(generatedAt)}, ${timeFormat.format(generatedAt).replace(':', '.')} WIB`;

export function reportPeriodText(filters: ReportFilters) {
  const first = reportDate(filters.startDate);
  if (filters.startDate === filters.endDate) return `Periode : 1 hari (${first})`;
  const label = filters.period === 'custom' ? '' : `${reportPeriodLabels[filters.period]} (`;
  const range = `${first} s.d. ${reportDate(filters.endDate)}`;
  return `Periode : ${label}${range}${label ? ')' : ''}`;
}

export function reportEntryFields(row: ReportRow): [string, string][] {
  const fields: [string, string][] = [
    ['Nama', row.name],
    ['Kategori', row.category === 'Bayi/Balita' ? 'Bayi/balita' : row.category],
    ['Posyandu', row.posyandu],
  ];
  if (row.category === 'Bayi/Balita') {
    if (row.weightKg !== undefined && row.heightCm !== undefined) {
      fields.push(['Berat badan', `${numberFormat.format(row.weightKg)} kg`], ['TB', `${numberFormat.format(row.heightCm)} cm`]);
    } else {
      fields.push(['Hasil pengukuran', row.result]);
    }
  } else if (row.category === 'Ibu Hamil') {
    fields.push(['Kunjungan', row.result === 'Kunjungan' ? '-' : row.result]);
  } else {
    fields.push(['Pemeriksaan', row.result === 'Pemeriksaan' ? '-' : row.result]);
  }
  fields.push(['Catatan', row.notes.trim() || '-']);
  return fields;
}

export function reportDateGroups(rows: ReportRow[]) {
  const groups: { date: string; records: ReportRow[] }[] = [];
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.category.localeCompare(b.category) || a.id.localeCompare(b.id));
  for (const row of sorted) {
    const last = groups.at(-1);
    if (last?.date === row.date) last.records.push(row);
    else groups.push({ date: row.date, records: [row] });
  }
  return groups;
}
