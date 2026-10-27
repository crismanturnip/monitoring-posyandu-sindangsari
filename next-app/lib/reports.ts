import type { SupabaseClient } from '@supabase/supabase-js';

export type ReportCategory = 'balita' | 'ibu-hamil' | 'lansia';
export type ReportFilters = { category: ReportCategory; posyanduId: string; startDate: string; endDate: string };
export type ReportRow = { id: string; date: string; category: string; name: string; posyandu: string; result: string; notes: string };

const categories = new Set<ReportCategory>(['balita', 'ibu-hamil', 'lansia']);
const validDate = (value?: string) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));

function jakartaDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function normalizeReportFilters(input: { category?: string; posyandu?: string; start?: string; end?: string }): ReportFilters {
  const today = jakartaDate();
  const category = categories.has(input.category as ReportCategory) ? input.category as ReportCategory : 'balita';
  const startDate = validDate(input.start) ? input.start! : `${today.slice(0, 8)}01`;
  const endDate = validDate(input.end) ? input.end! : today;
  return { category, posyanduId: input.posyandu ?? '', startDate, endDate };
}

type ChildRecord = { id: string; measured_at: string; weight_kg: number; height_cm: number; officer_notes: string | null; children: { name: string; posyandu_id: string; posyandu: { name: string } | null } | null };
type MotherRecord = { id: string; visited_at: string; officer_notes: string | null; pregnant_mothers: { name: string; posyandu_id: string; posyandu: { name: string } | null } | null };
type ElderlyRecord = { id: string; examined_at: string; officer_notes: string | null; elderly_people: { name: string; posyandu_id: string; posyandu: { name: string } | null } | null };

export async function loadReportRows(supabase: SupabaseClient, filters: ReportFilters): Promise<{ rows: ReportRow[]; error: string | null }> {
  if (filters.startDate > filters.endDate) return { rows: [], error: 'Tanggal awal tidak boleh melewati tanggal akhir.' };

  if (filters.category === 'balita') {
    let query = supabase.from('child_measurements').select('id, measured_at, weight_kg, height_cm, officer_notes, children!inner(name, posyandu_id, posyandu(name))').gte('measured_at', filters.startDate).lte('measured_at', filters.endDate).order('measured_at', { ascending: false });
    if (filters.posyanduId) query = query.eq('children.posyandu_id', filters.posyanduId);
    const { data, error } = await query;
    if (error) return { rows: [], error: `Laporan bayi/balita gagal dimuat: ${error.message}` };
    const records = (data ?? []) as unknown as ChildRecord[];
    return { rows: records.map((item) => ({ id: item.id, date: item.measured_at, category: 'Bayi/Balita', name: item.children?.name ?? '-', posyandu: item.children?.posyandu?.name ?? '-', result: `BB ${item.weight_kg} kg; TB/PB ${item.height_cm} cm`, notes: item.officer_notes ?? '-' })), error: null };
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

export function reportFilename(filters: ReportFilters, extension: 'csv' | 'pdf') {
  return `laporan-${filters.category}-${filters.startDate}-${filters.endDate}.${extension}`;
}
