'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireActiveProfile, requireBidan } from '@/lib/auth';

const optionalNumber = (value: FormDataEntryValue | null) => {
  const parsed = Number(String(value ?? '').trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const isValidNik = (nik: string) => /^\d{16}$/.test(nik);

export async function createChild(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const nik = String(formData.get('nik') ?? '').trim();
  const motherName = String(formData.get('motherName') ?? '').trim();
  const posyanduId = String(formData.get('posyanduId') ?? '');
  const birthDate = String(formData.get('birthDate') ?? '');
  const gender = String(formData.get('gender') ?? '');
  const kmsStatus = String(formData.get('kmsStatus') ?? '');
  if (!name || !isValidNik(nik) || !motherName || !posyanduId || !birthDate ||
      !['LAKI_LAKI', 'PEREMPUAN'].includes(gender) ||
      !['NONE', 'GIZI_BAIK', 'PERLU_PANTAUAN'].includes(kmsStatus)) {
    throw new Error('Lengkapi semua data wajib dengan nilai yang valid.');
  }
  const { supabase } = await requireActiveProfile();
  const { data, error } = await supabase.from('children').insert({
    name, nik, mother_name: motherName, posyandu_id: posyanduId, birth_date: birthDate, gender,
    kms_status: kmsStatus === 'NONE' ? null : kmsStatus,
    birth_place: String(formData.get('birthPlace') ?? '').trim() || null,
    child_order: optionalNumber(formData.get('childOrder')),
    delivery_type: String(formData.get('deliveryType') ?? '').trim() || null,
    birth_weight_kg: optionalNumber(formData.get('birthWeight')),
    birth_length_cm: optionalNumber(formData.get('birthLength')),
  }).select('id').single();
  if (error) throw new Error(`Gagal menyimpan data balita: ${error.message}`);
  if (!data) throw new Error('Data balita tidak berhasil disimpan.');
  revalidatePath('/balita');
  redirect(`/balita/${data.id}`);
}

export async function updateChild(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const nik = String(formData.get('nik') ?? '').trim();
  const motherName = String(formData.get('motherName') ?? '').trim();
  if (!id || !name || !isValidNik(nik) || !motherName) {
    throw new Error('Nama anak, NIK 16 digit, dan nama ibu wajib diisi.');
  }
  const { supabase } = await requireActiveProfile();
  const { error } = await supabase.from('children').update({
    name, nik, mother_name: motherName, birth_place: String(formData.get('birthPlace') ?? '').trim() || null,
    birth_date: String(formData.get('birthDate') ?? ''), gender: String(formData.get('gender') ?? ''),
    child_order: optionalNumber(formData.get('childOrder')), delivery_type: String(formData.get('deliveryType') ?? '').trim() || null,
    birth_weight_kg: optionalNumber(formData.get('birthWeight')), birth_length_cm: optionalNumber(formData.get('birthLength')),
  }).eq('id', id);
  if (error) throw new Error(`Gagal memperbarui data balita: ${error.message}`);
  revalidatePath('/balita');
  revalidatePath(`/balita/${id}`);
}

export async function updateChildFromModal(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const nik = String(formData.get('nik') ?? '').trim();
  const motherName = String(formData.get('motherName') ?? '').trim();
  const posyanduId = String(formData.get('posyanduId') ?? '');
  const birthDate = String(formData.get('birthDate') ?? '');
  const birthPlace = String(formData.get('birthPlace') ?? '').trim();
  const deliveryType = String(formData.get('deliveryType') ?? '').trim();
  const gender = String(formData.get('gender') ?? '');
  const kmsStatus = String(formData.get('kmsStatus') ?? '').trim();
  const weightValue = String(formData.get('weightKg') ?? '').trim();
  const heightValue = String(formData.get('heightCm') ?? '').trim();
  const weight = optionalNumber(formData.get('weightKg'));
  const height = optionalNumber(formData.get('heightCm'));

  if (!id || !name || !isValidNik(nik) || !motherName || !posyanduId || !birthDate ||
      !['LAKI_LAKI', 'PEREMPUAN'].includes(gender)) {
    throw new Error('Nama balita, NIK 16 digit, nama ibu, Posyandu, tanggal lahir, dan jenis kelamin wajib diisi.');
  }
  if (Boolean(weightValue) !== Boolean(heightValue)) {
    throw new Error('Isi berat dan tinggi badan bersama-sama, atau kosongkan keduanya jika tidak mencatat pengukuran.');
  }
  if ((weightValue && !weight) || (heightValue && !height)) {
    throw new Error('Berat dan tinggi badan harus berupa angka lebih besar dari 0.');
  }
  if (kmsStatus && kmsStatus !== 'NONE' && !['GIZI_BAIK', 'PERLU_PANTAUAN'].includes(kmsStatus)) {
    throw new Error('Pilih status gizi KMS yang tersedia.');
  }

  const { profile, supabase } = await requireActiveProfile();
  const childUpdates: {
    name: string;
    nik: string;
    mother_name: string;
    posyandu_id: string;
    birth_place: string | null;
    birth_date: string;
    gender: string;
    delivery_type: string | null;
    kms_status?: string | null;
  } = {
    name,
    nik,
    mother_name: motherName,
    posyandu_id: posyanduId,
    birth_place: birthPlace || null,
    birth_date: birthDate,
    gender,
    delivery_type: deliveryType || null,
  };
  if (kmsStatus === 'NONE') childUpdates.kms_status = null;
  else if (kmsStatus) childUpdates.kms_status = kmsStatus;

  const { data: updatedChild, error: updateError } = await supabase
    .from('children')
    .update(childUpdates)
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (updateError) throw new Error(`Gagal memperbarui data balita: ${updateError.message}`);
  if (!updatedChild) {
    throw new Error('Data balita tidak berubah. Pastikan Anda memiliki akses ke Posyandu balita tersebut.');
  }

  if (weight && height) {
    const { error: measurementError } = await supabase.from('child_measurements').insert({
      child_id: id,
      measured_at: new Date().toISOString().slice(0, 10),
      weight_kg: weight,
      height_cm: height,
      officer_notes: String(formData.get('notes') ?? '').trim() || null,
      recorded_by: profile.id,
    });

    if (measurementError) throw new Error(`Data balita diperbarui, tetapi pengukuran gagal disimpan: ${measurementError.message}`);
  }

  revalidatePath('/balita');
  revalidatePath(`/balita/${id}`);
  redirect('/balita');
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
  if (!id) throw new Error('ID balita wajib tersedia untuk menghapus data.');
  const { supabase } = await requireBidan();
  const { error } = await supabase
    .from('children')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`Gagal menghapus data balita: ${error.message}`);
  revalidatePath('/balita');
  redirect('/balita');
}
