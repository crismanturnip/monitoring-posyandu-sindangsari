'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireActiveProfile, requireBidan } from '@/lib/auth';
import { isValidRecordDate, jakartaDate } from '@/lib/health-record-dates';
import { childRegisterGroup } from '@/lib/child-register';
import { optionalNik, optionalPositiveNumber, optionalText } from '@/lib/report-input';

const childReportFields = (formData: FormData) => ({
  mother_nik: optionalNik(formData, 'motherNik'),
  father_name: optionalText(formData, 'fatherName'),
  father_nik: optionalNik(formData, 'fatherNik'),
  phone_number: optionalText(formData, 'phoneNumber'),
  ...(formData.has('gestationalWeeks') ? { gestational_age_weeks: optionalPositiveNumber(formData, 'gestationalWeeks') } : {}),
});
const measurementReportFields = (formData: FormData) => ({
  head_circumference_cm: optionalPositiveNumber(formData, 'headCircumferenceCm'),
  lila_cm: optionalPositiveNumber(formData, 'lilaCm'),
});

const returnPath = (formData: FormData) => formData.get('returnPath') === '/bayi' ? '/bayi' : '/balita';

const optionalNumber = (value: FormDataEntryValue | null) => {
  const parsed = Number(String(value ?? '').trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const isValidNik = (nik: string) => /^\d{16}$/.test(nik);
const isValidNikForForm = (nik: string, required: boolean) => required ? isValidNik(nik) : !nik || isValidNik(nik);

export async function createChild(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const nik = String(formData.get('nik') ?? '').trim();
  const babyForm = returnPath(formData) === '/bayi';
  const motherName = String(formData.get('motherName') ?? '').trim();
  const posyanduId = String(formData.get('posyanduId') ?? '');
  const birthDate = String(formData.get('birthDate') ?? '');
  const gender = String(formData.get('gender') ?? '');
  const kmsStatus = String(formData.get('kmsStatus') ?? '');
  const weightValue = String(formData.get('weightKg') ?? '').trim();
  const heightValue = String(formData.get('heightCm') ?? '').trim();
  const weight = optionalNumber(formData.get('weightKg'));
  const height = optionalNumber(formData.get('heightCm'));
  const measuredAt = String(formData.get('measuredAt') ?? '');
  const hasMeasurement = Boolean(weightValue || heightValue);
  const hasOtherMeasurement = ['headCircumferenceCm', 'lilaCm', 'notes'].some(key => optionalText(formData, key));
  if (!name || !isValidNikForForm(nik, !babyForm) || !motherName || !posyanduId || !birthDate ||
      !['LAKI_LAKI', 'PEREMPUAN'].includes(gender) ||
      !['NONE', 'GIZI_BAIK', 'PERLU_PANTAUAN'].includes(kmsStatus)) {
    throw new Error('Lengkapi semua data wajib dengan nilai yang valid.');
  }
  if (hasMeasurement && (!weight || !height || !isValidRecordDate(measuredAt))) {
    throw new Error('Isi tanggal pengukuran, berat dan tinggi badan dengan lengkap dan valid, atau kosongkan kedua hasil pengukuran.');
  }
  if (hasOtherMeasurement && !hasMeasurement) throw new Error('Isi berat dan tinggi badan untuk menyimpan hasil pemeriksaan.');
  const { profile, supabase } = await requireActiveProfile();
  const { data, error } = await supabase.from('children').insert({
    name, nik: nik || null, mother_name: motherName, ...childReportFields(formData), posyandu_id: posyanduId, birth_date: birthDate, gender,
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
  revalidatePath('/bayi');
  revalidatePath('/laporan');
  const detailPath = `/${childRegisterGroup(birthDate, jakartaDate()) ?? 'balita'}/${data.id}`;
  if (hasMeasurement) {
    const { error: measurementError } = await supabase.from('child_measurements').insert({
      child_id: data.id, measured_at: measuredAt, weight_kg: weight, height_cm: height,
      ...measurementReportFields(formData), officer_notes: optionalText(formData, 'notes'),
      recorded_by: profile.id,
    });
    // Keep the saved identity and allow retrying only the measurement, without a duplicate child.
    if (measurementError) redirect(`${detailPath}?measurement=failed`);
    revalidatePath('/laporan');
  }
  redirect(detailPath);
}

export async function updateChild(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const nik = String(formData.get('nik') ?? '').trim();
  const motherName = String(formData.get('motherName') ?? '').trim();
  const babyForm = returnPath(formData) === '/bayi';
  if (!id || !name || !isValidNikForForm(nik, !babyForm) || !motherName) {
    throw new Error(babyForm
      ? 'Nama anak dan nama ibu wajib diisi; NIK bayi, jika diisi, harus terdiri dari 16 digit.'
      : 'Nama anak, NIK 16 digit, dan nama ibu wajib diisi.');
  }
  const { supabase } = await requireActiveProfile();
  const { error } = await supabase.from('children').update({
    name, nik: nik || null, mother_name: motherName, ...childReportFields(formData), birth_place: String(formData.get('birthPlace') ?? '').trim() || null,
    birth_date: String(formData.get('birthDate') ?? ''), gender: String(formData.get('gender') ?? ''),
    child_order: optionalNumber(formData.get('childOrder')), delivery_type: String(formData.get('deliveryType') ?? '').trim() || null,
    birth_weight_kg: optionalNumber(formData.get('birthWeight')), birth_length_cm: optionalNumber(formData.get('birthLength')),
  }).eq('id', id);
  if (error) throw new Error(`Gagal memperbarui data balita: ${error.message}`);
  revalidatePath('/balita');
  revalidatePath('/bayi');
  revalidatePath(`/balita/${id}`);
  revalidatePath(`/bayi/${id}`);
  revalidatePath('/laporan');
}

export async function updateChildFromModal(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const nik = String(formData.get('nik') ?? '').trim();
  const babyForm = returnPath(formData) === '/bayi';
  const motherName = String(formData.get('motherName') ?? '').trim();
  const posyanduId = String(formData.get('posyanduId') ?? '');
  const birthDate = String(formData.get('birthDate') ?? '');
  const birthPlace = String(formData.get('birthPlace') ?? '').trim();
  const deliveryType = String(formData.get('deliveryType') ?? '').trim();
  const gender = String(formData.get('gender') ?? '');
  const kmsStatus = String(formData.get('kmsStatus') ?? '').trim();

  if (!id || !name || !isValidNikForForm(nik, !babyForm) || !motherName || !posyanduId || !birthDate ||
      !['LAKI_LAKI', 'PEREMPUAN'].includes(gender)) {
    throw new Error(babyForm
      ? 'Nama bayi dan data wajib lainnya harus diisi; NIK bayi, jika diisi, harus terdiri dari 16 digit.'
      : 'Nama balita, NIK 16 digit, nama ibu, Posyandu, tanggal lahir, dan jenis kelamin wajib diisi.');
  }
  if (kmsStatus && kmsStatus !== 'NONE' && !['GIZI_BAIK', 'PERLU_PANTAUAN'].includes(kmsStatus)) {
    throw new Error('Pilih status gizi KMS yang tersedia.');
  }

  const { supabase } = await requireActiveProfile();
  const childUpdates: {
    name: string;
    nik: string | null;
    mother_name: string;
    mother_nik: string | null;
    father_name: string | null;
    father_nik: string | null;
    phone_number: string | null;
    gestational_age_weeks?: number | null;
    posyandu_id: string;
    birth_place: string | null;
    birth_date: string;
    gender: string;
    delivery_type: string | null;
    birth_weight_kg?: number | null;
    birth_length_cm?: number | null;
    kms_status?: string | null;
  } = {
    name,
    nik: nik || null,
    mother_name: motherName,
    ...childReportFields(formData),
    posyandu_id: posyanduId,
    birth_place: birthPlace || null,
    birth_date: birthDate,
    gender,
    delivery_type: deliveryType || null,
  };
  if (formData.has('birthWeight')) childUpdates.birth_weight_kg = optionalNumber(formData.get('birthWeight'));
  if (formData.has('birthLength')) childUpdates.birth_length_cm = optionalNumber(formData.get('birthLength'));
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

  // Sync birth weight/length to the oldest child_measurement row (if any)
  const birthWeightVal = formData.has('birthWeight') ? optionalNumber(formData.get('birthWeight')) : null;
  const birthLengthVal = formData.has('birthLength') ? optionalNumber(formData.get('birthLength')) : null;
  if (birthWeightVal !== null || birthLengthVal !== null) {
    const { data: firstMeasurements } = await supabase
      .from('child_measurements')
      .select('id')
      .eq('child_id', id)
      .order('measured_at', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(1);
    if (firstMeasurements && firstMeasurements.length > 0) {
      const mUpdate: { weight_kg?: number; height_cm?: number } = {};
      if (birthWeightVal !== null) mUpdate.weight_kg = birthWeightVal;
      if (birthLengthVal !== null) mUpdate.height_cm = birthLengthVal;
      await supabase
        .from('child_measurements')
        .update(mUpdate)
        .eq('id', firstMeasurements[0].id)
        .eq('child_id', id);
    }
  }

  revalidatePath('/balita');
  revalidatePath('/bayi');
  revalidatePath(`/balita/${id}`);
  revalidatePath(`/bayi/${id}`);
  revalidatePath('/laporan');
  redirect(returnPath(formData));
}

export async function updateMeasurement(formData: FormData) {
  const id = String(formData.get('measurementId') ?? '');
  const childId = String(formData.get('childId') ?? '');
  const measuredAt = String(formData.get('measuredAt') ?? '');
  const weight = optionalNumber(formData.get('weightKg'));
  const height = optionalNumber(formData.get('heightCm'));
  if (!id || !childId || !isValidRecordDate(measuredAt) || !weight || !height) {
    throw new Error('Isi tanggal, berat, dan tinggi pengukuran yang valid.');
  }
  const { supabase } = await requireActiveProfile();
  const { data, error } = await supabase.from('child_measurements').update({
    measured_at: measuredAt, weight_kg: weight, height_cm: height,
    ...measurementReportFields(formData), officer_notes: optionalText(formData, 'notes'),
  }).eq('id', id).eq('child_id', childId).select('id').maybeSingle();
  if (error) throw new Error(`Gagal memperbarui pengukuran: ${error.message}`);
  if (!data) throw new Error('Pengukuran tidak ditemukan atau tidak dapat diakses.');
  revalidatePath(`/balita/${childId}`);
  revalidatePath(`/bayi/${childId}`);
  revalidatePath('/laporan');
}

export async function addMeasurement(formData: FormData) {
  const childId = String(formData.get('childId') ?? '');
  const measuredAt = String(formData.get('measuredAt') ?? '');
  const weight = optionalNumber(formData.get('weightKg'));
  const height = optionalNumber(formData.get('heightCm'));
  if (!childId || !isValidRecordDate(measuredAt) || !weight || !height) {
    throw new Error('Isi tanggal pengukuran, berat dan tinggi badan dengan nilai yang valid.');
  }
  const { profile, supabase } = await requireActiveProfile();
  const { error } = await supabase.from('child_measurements').insert({
    child_id: childId, measured_at: measuredAt, weight_kg: weight, height_cm: height,
    ...measurementReportFields(formData),
    officer_notes: String(formData.get('notes') ?? '').trim() || null, recorded_by: profile.id,
  });
  if (error) throw new Error(`Gagal menyimpan pengukuran balita: ${error.message}`);
  revalidatePath(`/balita/${childId}`);
  revalidatePath(`/bayi/${childId}`);
  revalidatePath('/balita');
  revalidatePath('/bayi');
  revalidatePath('/laporan');
  redirect(`${returnPath(formData)}/${childId}`);
}

export async function softDeleteChild(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('ID balita wajib tersedia untuk menghapus data.');
  const { supabase } = await requireActiveProfile();
  const { error } = await supabase
    .from('children')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`Gagal menghapus data balita: ${error.message}`);
  revalidatePath('/balita');
  revalidatePath('/bayi');
  revalidatePath('/laporan');
  redirect(returnPath(formData));
}
