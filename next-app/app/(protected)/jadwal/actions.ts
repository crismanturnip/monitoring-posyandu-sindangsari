'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireBidan } from '@/lib/auth';

const categories = ['BALITA', 'IBU_HAMIL', 'LANSIA', 'UMUM'] as const;

const toIso = (dateTime: string) => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateTime)) return null;
  const value = new Date(`${dateTime}:00+07:00`);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
};

const refreshSchedules = () => {
  updateTag('public-schedules');
  revalidatePath('/jadwal');
  revalidatePath('/jadwal-publik');
  revalidatePath('/');
};

const fail = (base: string, message: string): never => redirect(`${base}${base.includes('?') ? '&' : '?'}error=${encodeURIComponent(message)}`);

function parseSchedule(formData: FormData, base: string) {
  const posyanduId = String(formData.get('posyanduId') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const location = String(formData.get('location') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const category = String(formData.get('targetCategory') ?? '');
  const date = String(formData.get('date') ?? '');
  const startsAt = toIso(`${date}T${String(formData.get('startTime') ?? '')}`);
  const endsAt = toIso(`${date}T${String(formData.get('endTime') ?? '')}`);

  if (!posyanduId || !title || !location || !startsAt || !endsAt || !(categories as readonly string[]).includes(category)) {
    fail(base, 'Lengkapi Posyandu, nama kegiatan, kategori, tanggal, waktu mulai, waktu selesai, dan lokasi.');
  }
  if (title.length > 80) fail(base, 'Nama kegiatan maksimal 80 karakter.');
  if (startsAt && endsAt && endsAt <= startsAt) fail(base, 'Waktu selesai harus setelah waktu mulai.');

  return { posyandu_id: posyanduId, title, description: description || null, starts_at: startsAt, ends_at: endsAt, location, target_category: category };
}

export async function createSchedule(formData: FormData) {
  const base = '/jadwal?tambah=1';
  const row = parseSchedule(formData, base);
  const { profile, supabase } = await requireBidan();
  const { error } = await supabase.from('schedules').insert({ ...row, status: 'TERJADWAL', is_public: true, created_by: profile.id });
  if (error) {
    console.error('createSchedule gagal:', error.code, error.message);
    fail(base, 'Jadwal gagal disimpan.');
  }
  refreshSchedules();
  redirect('/jadwal');
}

export async function updateSchedule(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const base = `/jadwal?edit=${encodeURIComponent(id)}`;
  const row = parseSchedule(formData, base);
  const { supabase } = await requireBidan();
  const { error } = await supabase.from('schedules').update({ ...row, status: 'TERJADWAL', cancelled_at: null }).eq('id', id);
  if (error) {
    console.error('updateSchedule gagal:', error.code, error.message);
    fail(base, 'Perubahan jadwal gagal disimpan.');
  }
  refreshSchedules();
  redirect('/jadwal');
}

export async function cancelSchedule(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const { supabase } = await requireBidan();
  await supabase.from('schedules').update({ status: 'DIBATALKAN', cancelled_at: new Date().toISOString() }).eq('id', id);
  refreshSchedules();
  redirect('/jadwal');
}

export async function deleteSchedule(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const { supabase } = await requireBidan();
  await supabase.from('schedules').delete().eq('id', id);
  refreshSchedules();
  redirect('/jadwal');
}
