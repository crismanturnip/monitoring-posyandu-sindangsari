'use server';

import { revalidatePath } from 'next/cache';
import { requireBidan } from '@/lib/auth';

const toIso = (dateTime: string) => {
  const value = new Date(dateTime);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
};

export async function createSchedule(formData: FormData) {
  const posyanduId = String(formData.get('posyanduId') ?? '');
  const startsAt = toIso(String(formData.get('startsAt') ?? ''));
  const location = String(formData.get('location') ?? '').trim();
  if (!posyanduId || !startsAt || !location) return;
  const { profile, supabase } = await requireBidan();
  await supabase.from('schedules').insert({ posyandu_id: posyanduId, starts_at: startsAt, location, status: 'TERJADWAL', is_public: true, created_by: profile.id });
  revalidatePath('/jadwal');
  revalidatePath('/jadwal-publik');
}

export async function cancelSchedule(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const { supabase } = await requireBidan();
  await supabase.from('schedules').update({ status: 'DIBATALKAN', cancelled_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/jadwal');
  revalidatePath('/jadwal-publik');
}

export async function updateSchedule(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const startsAt = toIso(String(formData.get('startsAt') ?? ''));
  const location = String(formData.get('location') ?? '').trim();
  if (!id || !startsAt || !location) return;
  const { supabase } = await requireBidan();
  await supabase.from('schedules').update({ starts_at: startsAt, location, status: 'TERJADWAL', cancelled_at: null }).eq('id', id);
  revalidatePath('/jadwal');
  revalidatePath('/jadwal-publik');
}
