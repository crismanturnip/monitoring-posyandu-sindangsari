'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireActiveProfile, requireBidan } from '@/lib/auth';

export async function createElderlyPerson(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const posyanduId = String(formData.get('posyanduId') ?? '');
  if (!name || !posyanduId) return;
  const { supabase } = await requireActiveProfile();
  const { data, error } = await supabase.from('elderly_people').insert({ name, posyandu_id: posyanduId }).select('id').single();
  if (error || !data) return;
  revalidatePath('/lansia');
  redirect(`/lansia/${data.id}`);
}

export async function updateElderlyPerson(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  if (!id || !name) return;
  const { supabase } = await requireActiveProfile();
  await supabase.from('elderly_people').update({ name }).eq('id', id);
  revalidatePath('/lansia');
  revalidatePath(`/lansia/${id}`);
}

export async function addElderlyExamination(formData: FormData) {
  const elderlyPersonId = String(formData.get('elderlyPersonId') ?? '');
  const examinedAt = String(formData.get('examinedAt') ?? '');
  if (!elderlyPersonId || !examinedAt) return;
  const { profile, supabase } = await requireActiveProfile();
  await supabase.from('elderly_examinations').insert({ elderly_person_id: elderlyPersonId, examined_at: examinedAt, officer_notes: String(formData.get('notes') ?? '').trim() || null, recorded_by: profile.id });
  revalidatePath(`/lansia/${elderlyPersonId}`);
}

export async function softDeleteElderlyPerson(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const { supabase } = await requireBidan();
  await supabase.from('elderly_people').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/lansia');
  redirect('/lansia');
}
