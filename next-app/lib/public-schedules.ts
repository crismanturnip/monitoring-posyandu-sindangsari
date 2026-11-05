import { unstable_cache } from 'next/cache';
import { createPublicSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/public';

export type PublicSchedule = {
  id: string;
  posyandu_name: string;
  starts_at: string;
  location: string;
  status: 'TERJADWAL' | 'SELESAI' | 'DIBATALKAN';
};

export const getPublicSchedules = unstable_cache(async (): Promise<PublicSchedule[]> => {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await createPublicSupabaseClient().rpc('get_public_schedules');
  if (error) throw new Error(`Jadwal publik gagal dimuat: ${error.message}`);
  return (data ?? []) as PublicSchedule[];
}, ['public-schedules'], { revalidate: 60, tags: ['public-schedules'] });
