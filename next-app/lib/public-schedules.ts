import { unstable_cache } from 'next/cache';
import { createPublicSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/public';
import type { ScheduleCategory } from '@/lib/schedule-categories';

export type PublicSchedule = {
  id: string;
  posyandu_name: string;
  title: string;
  description: string | null;
  target_category: ScheduleCategory;
  starts_at: string;
  ends_at: string | null;
  location: string;
  status: 'TERJADWAL' | 'SELESAI' | 'DIBATALKAN';
};

export const getPublicSchedules = unstable_cache(async (): Promise<PublicSchedule[]> => {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await createPublicSupabaseClient().rpc('get_public_schedules');
  if (error) throw new Error(`Jadwal publik gagal dimuat: ${error.message}`);
  // Bentuk lama (sebelum migrasi detail jadwal) belum punya title/kategori; beri nilai bawaan agar halaman tidak error.
  return ((data ?? []) as Partial<PublicSchedule>[]).map((row) => ({
    ...row,
    title: row.title ?? row.posyandu_name ?? 'Kegiatan Posyandu',
    description: row.description ?? null,
    target_category: row.target_category ?? 'UMUM',
    ends_at: row.ends_at ?? null,
  })) as PublicSchedule[];
}, ['public-schedules'], { revalidate: 60, tags: ['public-schedules'] });
