'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireActiveProfile, requireBidan } from '@/lib/auth';

const optionalNumber = (value: FormDataEntryValue | null) => {
  const parsed = Number(String(value ?? '').trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export async function createChild(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const motherName = String(formData.get('motherName') ?? '').trim();
  const posyanduId = String(formData.get('posyanduId') ?? '');
  const birthDate = String(formData.get('birthDate') ?? '');
  const gender = String(formData.get('gender') ?? '');
  if (!name || !motherName || !posyanduId || !birthDate || !['LAKI_LAKI', 'PEREMPUAN'].includes(gender)) return;
  const { supabase } = await requireActiveProfile();
  const { data, error } = await supabase.from('children').insert({
    name, mother_name: motherName, posyandu_id: posyanduId, birth_date: birthDate, gender,
    birth_place: String(formData.get('birthPlace') ?? '').trim() || null,
    child_order: optionalNumber(formData.get('childOrder')),
    delivery_type: String(formData.get('deliveryType') ?? '').trim() || null,
    birth_weight_kg: optionalNumber(formData.get('birthWeight')),
    birth_length_cm: optionalNumber(formData.get('birthLength')),
  }).select('id').single();
  if (error || !data) return;
  revalidatePath('/balita');
  redirect(`/balita/${data.id}`);
}

export async function updateChild(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const motherName = String(formData.get('motherName') ?? '').trim();
  if (!id || !name || !motherName) return;
  const { supabase } = await requireActiveProfile();
  await supabase.from('children').update({
    name, mother_name: motherName, birth_place: String(formData.get('birthPlace') ?? '').trim() || null,
    birth_date: String(formData.get('birthDate') ?? ''), gender: String(formData.get('gender') ?? ''),
    child_order: optionalNumber(formData.get('childOrder')), delivery_type: String(formData.get('deliveryType') ?? '').trim() || null,
    birth_weight_kg: optionalNumber(formData.get('birthWeight')), birth_length_cm: optionalNumber(formData.get('birthLength')),
  }).eq('id', id);
  revalidatePath('/balita');
  revalidatePath(`/balita/${id}`);
}

export async function addMeasurement(formData: FormData) {
  const childId = String(formData.get('childId') ?? '');
  const measuredAt = String(formData.get('measuredAt') ?? '');
  const weight = optionalNumber(formData.get('weightKg'));
  const height = optionalNumber(formData.get('heightCm'));
  if (!childId || !measuredAt || !weight || !height) return;
  const { profile, supabase } = await requireActiveProfile();
  await supabase.from('child_measurements').insert({
    child_id: childId, measured_at: measuredAt, weight_kg: weight, height_cm: height,
    officer_notes: String(formData.get('notes') ?? '').trim() || null, recorded_by: profile.id,
  });
  revalidatePath(`/balita/${childId}`);
}

export async function softDeleteChild(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const { supabase } = await requireBidan();
  await supabase.from('children').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/balita');
  redirect('/balita');
}
