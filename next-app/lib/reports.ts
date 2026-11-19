import type { SupabaseClient } from '@supabase/supabase-js';
import { reportDateRange, reportPeriodLabels, type ReportPeriod } from './report-periods';
import { reportGeneratedDate } from './report-document';
import { jakartaDate } from './health-record-dates';
import { reportAgeParts } from './report-age';

export type ReportCategory = 'semua' | 'bayi' | 'balita' | 'ibu-hamil' | 'lansia';
export type ReportFilters = { category: ReportCategory; period: ReportPeriod; posyanduId: string; startDate: string; endDate: string };
export type ReportRow = {
  id: string; personId?: string; date: string; category: string; name: string; posyandu: string;
  result: string; notes: string; weightKg?: number; heightCm?: number;
  nik?: string; birthDate?: string; gender?: string; motherName?: string; motherNik?: string;
  fatherName?: string; fatherNik?: string; phone?: string; deliveryType?: string;
  gestationalWeeks?: number; headCircumferenceCm?: number; lilaCm?: number;
  husbandName?: string; husbandNik?: string; bloodPressure?: string;
};
export type ReportAvailability = { count: number; startDate: string | null; endDate: string | null; error: string | null };

const reportSources = {
  children: { table: 'child_measurements', dateColumn: 'measured_at', relation: 'children', personKey: 'child_id', label: 'Bayi/Balita' },
  mothers: { table: 'pregnancy_visits', dateColumn: 'visited_at', relation: 'pregnant_mothers', personKey: 'pregnant_mother_id', label: 'Ibu Hamil' },
  elderly: { table: 'elderly_examinations', dateColumn: 'examined_at', relation: 'elderly_people', personKey: 'elderly_person_id', label: 'Lansia' },
} as const;
const categories = new Set<ReportCategory>(['semua', 'bayi', 'balita', 'ibu-hamil', 'lansia']);
const REPORT_BATCH_SIZE = 500;
type ReportQuery = PromiseLike<{ data: unknown[] | null; error: { message: string } | null; count: number | null }> & {
  range(from: number, to: number): ReportQuery;
};

async function loadReportRecords(query: ReportQuery) {
  const records: unknown[] = [];
  while (true) {
    const { data, error, count } = await query.range(records.length, records.length + REPORT_BATCH_SIZE - 1);
    if (error) return { data: null, error };
    const batch = data ?? [];
    records.push(...batch);
    if (count !== null ? records.length >= count : batch.length < REPORT_BATCH_SIZE) {
      return { data: records, error: null };
    }
    if (!batch.length) return { data: null, error: { message: 'Data laporan berubah saat dimuat. Silakan muat ulang.' } };
  }
}
const validDate = (value?: string) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

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

type Source = typeof reportSources[keyof typeof reportSources];
type Person = Record<string, unknown> & { id: string; name: string; created_at?: string; posyandu: { name: string } | null };
const textField = (value: unknown) => typeof value === 'string' && value.trim() ? value : undefined;
const numberField = (value: unknown) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : undefined;

function personFields(person: Person) {
  return {
    personId: person.id, name: person.name, posyandu: person.posyandu?.name ?? '—',
    nik: textField(person.nik), birthDate: textField(person.birth_date), gender: textField(person.gender),
    motherName: textField(person.mother_name), motherNik: textField(person.mother_nik),
    fatherName: textField(person.father_name), fatherNik: textField(person.father_nik),
    husbandName: textField(person.husband_name), husbandNik: textField(person.husband_nik),
    phone: textField(person.phone_number), deliveryType: textField(person.delivery_type),
    gestationalWeeks: numberField(person.gestational_age_weeks),
  };
}

function categoryFor(source: Source, birthDate: string | undefined, date: string) {
  if (source !== reportSources.children) return source.label;
  const age = reportAgeParts(birthDate, date);
  return age && age.months < 12 ? 'Bayi' : 'Balita';
}

async function loadSource(supabase: SupabaseClient, filters: ReportFilters, source: Source) {
  let historyQuery = supabase.from(source.table)
    .select(`*, ${source.relation}!inner(*, posyandu(name))`, { count: 'exact' })
    .is(`${source.relation}.deleted_at`, null)
    .gte(source.dateColumn, filters.startDate).lte(source.dateColumn, filters.endDate)
    .order(source.dateColumn, { ascending: false }).order('id', { ascending: true });
  let peopleQuery = supabase.from(source.relation).select('*, posyandu(name)', { count: 'exact' })
    .is('deleted_at', null)
    .gte('created_at', `${filters.startDate}T00:00:00+07:00`)
    .lte('created_at', `${filters.endDate}T23:59:59.999999+07:00`)
    .order('created_at', { ascending: false }).order('id', { ascending: true });
  if (filters.posyanduId) {
    historyQuery = historyQuery.eq('recorded_posyandu_id', filters.posyanduId);
    peopleQuery = peopleQuery.eq('registered_posyandu_id', filters.posyanduId);
  }
  const [history, people] = await Promise.all([loadReportRecords(historyQuery), loadReportRecords(peopleQuery)]);
  const error = history.error ?? people.error;
  if (error) return { rows: [], error: `Laporan ${source.label} gagal dimuat: ${error.message}` };
  const represented = new Set<string>();
  const rows: ReportRow[] = [];
  for (const value of history.data ?? []) {
    const item = value as Record<string, unknown>;
    const person = item[source.relation] as Person | null;
    if (!person) continue;
    const metadata = personFields(person);
    const personId = person.id ?? textField(item[source.personKey]);
    if (personId) represented.add(personId);
    const date = String(item[source.dateColumn]);
    const weightKg = numberField(item.weight_kg), heightCm = numberField(item.height_cm);
    rows.push({
      ...metadata, posyandu: textField(item.recorded_posyandu_name) ?? metadata.posyandu,
      personId, id: String(item.id), date, category: categoryFor(source, metadata.birthDate, date),
      result: source === reportSources.children ? `BB ${weightKg ?? '—'} kg; TB/PB ${heightCm ?? '—'} cm` : source === reportSources.mothers ? 'Kunjungan' : 'Pemeriksaan',
      notes: textField(item.officer_notes) ?? '—', weightKg, heightCm,
      headCircumferenceCm: numberField(item.head_circumference_cm), lilaCm: numberField(item.lila_cm),
    });
  }
  for (const value of people.data ?? []) {
    const person = value as Person;
    if (represented.has(person.id) || !person.created_at) continue;
    const date = jakartaDate(new Date(person.created_at));
    const metadata = personFields(person);
    rows.push({ ...metadata, posyandu: textField(person.registered_posyandu_name) ?? metadata.posyandu,
      id: `registration:${person.id}`, date, category: categoryFor(source, metadata.birthDate, date), result: '—', notes: '—' });
  }
  return { rows, error: null };
}

export async function loadReportRows(supabase: SupabaseClient, filters: ReportFilters): Promise<{ rows: ReportRow[]; error: string | null }> {
  if (filters.startDate > filters.endDate) return { rows: [], error: 'Tanggal awal tidak boleh melewati tanggal akhir.' };
  const sources = filters.category === 'semua' ? [reportSources.children, reportSources.mothers]
    : filters.category === 'bayi' || filters.category === 'balita' ? [reportSources.children]
    : filters.category === 'ibu-hamil' ? [reportSources.mothers] : [reportSources.elderly];
  const reports = await Promise.all(sources.map(source => loadSource(supabase, filters, source)));
  const errors = reports.flatMap(report => report.error ? [report.error] : []);
  if (errors.length) return { rows: [], error: errors.join(' ') };
  const rows = reports.flatMap(report => report.rows)
    .filter(row => filters.category === 'bayi' ? row.category === 'Bayi' : filters.category === 'balita' ? row.category === 'Balita' : true)
    .sort((a, b) => b.date.localeCompare(a.date) || a.category.localeCompare(b.category) || a.id.localeCompare(b.id));
  return { rows, error: null };
}

export async function loadReportAvailability(supabase: SupabaseClient, filters: ReportFilters): Promise<ReportAvailability> {
  const report = await loadReportRows(supabase, { ...filters, startDate: '0001-01-01', endDate: '9999-12-31' });
  if (report.error) return { count: 0, startDate: null, endDate: null, error: report.error };
  const dates = report.rows.map(row => row.date).sort();
  return { count: report.rows.length, startDate: dates[0] ?? null, endDate: dates.at(-1) ?? null, error: null };
}

export function reportFilename(extension: 'xlsx' | 'pdf', generatedAt = new Date()) {
  return `Laporan Data Posyandu Sindang Sari - Generate ${reportGeneratedDate(generatedAt)}.${extension}`;
}
