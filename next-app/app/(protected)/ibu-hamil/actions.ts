'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireActiveProfile, requireBidan } from '@/lib/auth';

export async function createPregnantMother(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const posyanduId = String(formData.get('posyanduId') ?? '');
  if (!name || !posyanduId) return;
  const { supabase } = await requireActiveProfile();
  const { data, error } = await supabase.from('pregnant_mothers').insert({ name, posyandu_id: posyanduId }).select('id').single();
  if (error || !data) return;
  revalidatePath('/ibu-hamil');
  redirect(`/ibu-hamil/${data.id}`);
}

export async function updatePregnantMother(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  if (!id || !name) return;
  const { supabase } = await requireActiveProfile();
  await supabase.from('pregnant_mothers').update({ name }).eq('id', id);
  revalidatePath('/ibu-hamil');
  revalidatePath(`/ibu-hamil/${id}`);
}

export async function addPregnancyVisit(formData: FormData) {
  const pregnantMotherId = String(formData.get('pregnantMotherId') ?? '');
  const visitedAt = String(formData.get('visitedAt') ?? '');
  if (!pregnantMotherId || !visitedAt) return;
  const { profile, supabase } = await requireActiveProfile();
  await supabase.from('pregnancy_visits').insert({ pregnant_mother_id: pregnantMotherId, visited_at: visitedAt, officer_notes: String(formData.get('notes') ?? '').trim() || null, recorded_by: profile.id });
  revalidatePath(`/ibu-hamil/${pregnantMotherId}`);
}

export async function softDeletePregnantMother(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const { supabase } = await requireBidan();
  await supabase.from('pregnant_mothers').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/ibu-hamil');
  redirect('/ibu-hamil');
}
