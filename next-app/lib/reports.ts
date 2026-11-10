import type { SupabaseClient } from '@supabase/supabase-js';
import { reportDateRange, reportPeriodLabels, type ReportPeriod } from './report-periods';
import { reportGeneratedDate } from './report-document';

export type ReportCategory = 'semua' | 'balita' | 'ibu-hamil' | 'lansia';
export type ReportFilters = { category: ReportCategory; period: ReportPeriod; posyanduId: string; startDate: string; endDate: string };
export type ReportRow = { id: string; date: string; category: string; name: string; posyandu: string; result: string; notes: string; weightKg?: number; heightCm?: number };
export type ReportAvailability = { count: number; startDate: string | null; endDate: string | null; error: string | null };

const reportSources = {
  balita: { table: 'child_measurements', dateColumn: 'measured_at', relation: 'children' },
  'ibu-hamil': { table: 'pregnancy_visits', dateColumn: 'visited_at', relation: 'pregnant_mothers' },
  lansia: { table: 'elderly_examinations', dateColumn: 'examined_at', relation: 'elderly_people' },
} as const;

const individualCategories = ['balita', 'ibu-hamil', 'lansia'] as const;
const categories = new Set<ReportCategory>(['semua', ...individualCategories]);
const validDate = (value?: string) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

function jakartaDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function normalizeReportFilters(input: { category?: string; period?: string; posyandu?: string; start?: string; end?: string }): ReportFilters {
  const today = jakartaDate();
  const category = categories.has(input.category as ReportCategory) ? input.category as ReportCategory : 'semua';
  const period: ReportPeriod = input.period && Object.hasOwn(reportPeriodLabels, input.period)
    ? input.period as ReportPeriod
    : validDate(input.start) || validDate(input.end) ? 'custom' : '1-bulan';
  const endDate = validDate(input.end) ? input.end! : today;
  const dates = period === 'custom'
    ? { startDate: validDate(input.start) ? input.start! : `${endDate.slice(0, 8)}01`, endDate }
    : reportDateRange(period, endDate);
  return { category, period, posyanduId: input.posyandu ?? '', ...dates };
}

type ChildRecord = { id: string; measured_at: string; weight_kg: number; height_cm: number; officer_notes: string | null; children: { name: string; posyandu_id: string; posyandu: { name: string } | null } | null };
type MotherRecord = { id: string; visited_at: string; officer_notes: string | null; pregnant_mothers: { name: string; posyandu_id: string; posyandu: { name: string } | null } | null };
type ElderlyRecord = { id: string; examined_at: string; officer_notes: string | null; elderly_people: { name: string; posyandu_id: string; posyandu: { name: string } | null } | null };

export async function loadReportRows(supabase: SupabaseClient, filters: ReportFilters): Promise<{ rows: ReportRow[]; error: string | null }> {
  if (filters.startDate > filters.endDate) return { rows: [], error: 'Tanggal awal tidak boleh melewati tanggal akhir.' };

  if (filters.category === 'semua') {
    const reports = await Promise.all(individualCategories.map((category) => loadReportRows(supabase, { ...filters, category })));
    const errors = reports.flatMap((report) => report.error ? [report.error] : []);
    if (errors.length) return { rows: [], error: errors.join(' ') };
    const rows = reports.flatMap((report) => report.rows).sort((a, b) => b.date.localeCompare(a.date) || a.category.localeCompare(b.category) || a.id.localeCompare(b.id));
    return { rows, error: null };
  }

  if (filters.category === 'balita') {
    let query = supabase.from('child_measurements').select('id, measured_at, weight_kg, height_cm, officer_notes, children!inner(name, posyandu_id, posyandu(name))').gte('measured_at', filters.startDate).lte('measured_at', filters.endDate).order('measured_at', { ascending: false });
    if (filters.posyanduId) query = query.eq('children.posyandu_id', filters.posyanduId);
    const { data, error } = await query;
    if (error) return { rows: [], error: `Laporan bayi/balita gagal dimuat: ${error.message}` };
    const records = (data ?? []) as unknown as ChildRecord[];
    return { rows: records.map((item) => ({ id: item.id, date: item.measured_at, category: 'Bayi/Balita', name: item.children?.name ?? '-', posyandu: item.children?.posyandu?.name ?? '-', result: `BB ${item.weight_kg} kg; TB/PB ${item.height_cm} cm`, notes: item.officer_notes ?? '-', weightKg: Number(item.weight_kg), heightCm: Number(item.height_cm) })), error: null };
  }

  if (filters.category === 'ibu-hamil') {
    let query = supabase.from('pregnancy_visits').select('id, visited_at, officer_notes, pregnant_mothers!inner(name, posyandu_id, posyandu(name))').gte('visited_at', filters.startDate).lte('visited_at', filters.endDate).order('visited_at', { ascending: false });
    if (filters.posyanduId) query = query.eq('pregnant_mothers.posyandu_id', filters.posyanduId);
    const { data, error } = await query;
    if (error) return { rows: [], error: `Laporan ibu hamil gagal dimuat: ${error.message}` };
    const records = (data ?? []) as unknown as MotherRecord[];
    return { rows: records.map((item) => ({ id: item.id, date: item.visited_at, category: 'Ibu Hamil', name: item.pregnant_mothers?.name ?? '-', posyandu: item.pregnant_mothers?.posyandu?.name ?? '-', result: 'Kunjungan', notes: item.officer_notes ?? '-' })), error: null };
  }

  let query = supabase.from('elderly_examinations').select('id, examined_at, officer_notes, elderly_people!inner(name, posyandu_id, posyandu(name))').gte('examined_at', filters.startDate).lte('examined_at', filters.endDate).order('examined_at', { ascending: false });
  if (filters.posyanduId) query = query.eq('elderly_people.posyandu_id', filters.posyanduId);
  const { data, error } = await query;
  if (error) return { rows: [], error: `Laporan lansia gagal dimuat: ${error.message}` };
  const records = (data ?? []) as unknown as ElderlyRecord[];
  return { rows: records.map((item) => ({ id: item.id, date: item.examined_at, category: 'Lansia', name: item.elderly_people?.name ?? '-', posyandu: item.elderly_people?.posyandu?.name ?? '-', result: 'Pemeriksaan', notes: item.officer_notes ?? '-' })), error: null };
}

export async function loadReportAvailability(supabase: SupabaseClient, filters: ReportFilters): Promise<ReportAvailability> {
  if (filters.category === 'semua') {
    const reports = await Promise.all(individualCategories.map((category) => loadReportAvailability(supabase, { ...filters, category })));
    const errors = reports.flatMap((report) => report.error ? [report.error] : []);
    if (errors.length) return { count: 0, startDate: null, endDate: null, error: errors.join(' ') };
    const startDates = reports.flatMap((report) => report.startDate ? [report.startDate] : []).sort();
    const endDates = reports.flatMap((report) => report.endDate ? [report.endDate] : []).sort();
    return { count: reports.reduce((sum, report) => sum + report.count, 0), startDate: startDates[0] ?? null, endDate: endDates.at(-1) ?? null, error: null };
  }
  const source = reportSources[filters.category];
  const query = (count = false) => {
    let result = supabase.from(source.table).select(`${source.dateColumn}, ${source.relation}!inner(posyandu_id)`, count ? { count: 'exact' } : {});
    if (filters.posyanduId) result = result.eq(`${source.relation}.posyandu_id`, filters.posyanduId);
    return result;
  };
  // Keep the same category, Posyandu, and account permissions; only remove the date range.
  const [first, last] = await Promise.all([
    query(true).order(source.dateColumn, { ascending: true }).limit(1),
    query().order(source.dateColumn, { ascending: false }).limit(1),
  ]);
  const error = first.error ?? last.error;
  if (error) return { count: 0, startDate: null, endDate: null, error: `Ketersediaan riwayat gagal diperiksa: ${error.message}` };
  const firstRecord = first.data?.[0] as unknown as Record<string, string> | undefined;
  const lastRecord = last.data?.[0] as unknown as Record<string, string> | undefined;
  return { count: first.count ?? 0, startDate: firstRecord?.[source.dateColumn] ?? null, endDate: lastRecord?.[source.dateColumn] ?? null, error: null };
}

export function reportFilename(extension: 'xlsx' | 'pdf', generatedAt = new Date()) {
  return `Laporan Data Posyandu Sindang Sari - Generate ${reportGeneratedDate(generatedAt)}.${extension}`;
}
