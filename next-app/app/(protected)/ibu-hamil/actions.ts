'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireActiveProfile } from '@/lib/auth';
import { jakartaDate, isValidRecordDate } from '@/lib/health-record-dates';
import { examinationNotes } from '@/lib/examination-notes';
import { optionalNik, optionalPositiveNumber, optionalText } from '@/lib/report-input';

function optionalCount(formData: FormData, key: string, minimum: number) {
  const value = optionalText(formData, key);
  if (!value) return null;
  if (!/^\d+$/.test(value)) throw new Error(`${key} harus berupa bilangan bulat.`);
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < minimum || count > 32767) {
    throw new Error(`${key} harus berupa bilangan bulat antara ${minimum} dan 32767.`);
  }
  return count;
}

function motherFields(formData: FormData) {
  const birthDate = optionalText(formData, 'birthDate');
  const hpht = optionalText(formData, 'hpht');
  if (birthDate && !isValidRecordDate(birthDate)) throw new Error('Tanggal lahir ibu tidak valid.');
  if (hpht && !isValidRecordDate(hpht)) throw new Error('Tanggal HPHT tidak valid.');
  return {
    nik: optionalNik(formData, 'nik'), birth_date: birthDate,
    husband_name: optionalText(formData, 'husbandName'), husband_nik: optionalNik(formData, 'husbandNik'),
    phone_number: optionalText(formData, 'phoneNumber'),
    gestational_age_weeks: optionalPositiveNumber(formData, 'gestationalWeeks'),
    hpht,
    gravida: optionalCount(formData, 'gravida', 1),
    para: optionalCount(formData, 'para', 0),
    abortus: optionalCount(formData, 'abortus', 0),
  };
}

export async function createPregnantMother(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const posyanduId = String(formData.get('posyanduId') ?? '');
  if (!name || !posyanduId) throw new Error('Nama ibu hamil dan Posyandu wajib diisi.');
  const notes = examinationNotes(formData, 'ibu-hamil');
  const visitedAtRaw = String(formData.get('visitedAt') ?? '').trim();
  if (visitedAtRaw && !isValidRecordDate(visitedAtRaw)) throw new Error('Isi tanggal pemeriksaan yang valid.');
  const visitedAt = visitedAtRaw || jakartaDate();
  if (notes && !isValidRecordDate(visitedAt)) throw new Error('Isi tanggal pemeriksaan yang valid.');
  const { profile, supabase } = await requireActiveProfile();
  const { data, error } = await supabase.from('pregnant_mothers').insert({ name, posyandu_id: posyanduId, ...motherFields(formData) }).select('id').single();
  if (error) throw new Error(`Gagal menyimpan data ibu hamil: ${error.message}`);
  if (!data) throw new Error('Data ibu hamil tidak berhasil disimpan.');
  revalidatePath('/ibu-hamil');
  revalidatePath('/laporan');
  if (notes) {
    const { error: visitError } = await supabase.from('pregnancy_visits').insert({
      pregnant_mother_id: data.id, visited_at: visitedAt, officer_notes: notes, recorded_by: profile.id,
    });
    if (visitError) redirect(`/ibu-hamil/${data.id}?visit=failed`);
    revalidatePath('/laporan');
  }
  const returnTo = String(formData.get('returnTo') ?? '').trim();
  if (returnTo) redirect(returnTo);
  redirect(`/ibu-hamil/${data.id}`);
}

export async function updatePregnantMother(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  if (!id || !name) throw new Error('Pilih ibu hamil dan isi nama lengkap.');
  const { supabase } = await requireActiveProfile();
  const posyanduId = String(formData.get('posyanduId') ?? '');
  const { data: updated, error } = await supabase.from('pregnant_mothers')
    .update({ name, ...motherFields(formData), ...(posyanduId ? { posyandu_id: posyanduId } : {}) }).eq('id', id).select('id').maybeSingle();
  if (error) throw new Error(`Gagal memperbarui data ibu hamil: ${error.message}`);
  if (!updated) throw new Error('Data ibu hamil tidak ditemukan atau tidak dapat diakses.');
  revalidatePath('/ibu-hamil');
  revalidatePath(`/ibu-hamil/${id}`);
  revalidatePath('/laporan');
  const returnTo = String(formData.get('returnTo') ?? '').trim();
  if (returnTo) redirect(returnTo);
}

export async function updatePregnancyVisit(formData: FormData) {
  const id = String(formData.get('visitId') ?? '');
  const motherId = String(formData.get('pregnantMotherId') ?? '');
  const visitedAt = String(formData.get('visitedAt') ?? '');
  if (!id || !motherId || !isValidRecordDate(visitedAt)) throw new Error('Pilih kunjungan dan tanggal yang valid.');
  const { supabase } = await requireActiveProfile();
  const { data, error } = await supabase.from('pregnancy_visits').update({
    visited_at: visitedAt,
    officer_notes: examinationNotes(formData, 'ibu-hamil'),
  }).eq('id', id).eq('pregnant_mother_id', motherId).select('id').maybeSingle();
  if (error) throw new Error(`Gagal memperbarui kunjungan: ${error.message}`);
  if (!data) throw new Error('Kunjungan tidak ditemukan atau tidak dapat diakses.');
  revalidatePath(`/ibu-hamil/${motherId}`);
  revalidatePath('/laporan');
}

export async function addPregnancyVisit(formData: FormData) {
  const pregnantMotherId = String(formData.get('pregnantMotherId') ?? '');
  const visitedAt = String(formData.get('visitedAt') ?? '');
  if (!pregnantMotherId || !isValidRecordDate(visitedAt)) throw new Error('Pilih ibu hamil dan tanggal kunjungan yang valid.');
  const { profile, supabase } = await requireActiveProfile();
  const { error } = await supabase.from('pregnancy_visits').insert({ pregnant_mother_id: pregnantMotherId, visited_at: visitedAt, officer_notes: examinationNotes(formData, 'ibu-hamil'), recorded_by: profile.id });
  if (error) throw new Error(`Gagal menyimpan kunjungan ibu hamil: ${error.message}`);
  revalidatePath(`/ibu-hamil/${pregnantMotherId}`);
  revalidatePath('/ibu-hamil');
  revalidatePath('/laporan');
  redirect(`/ibu-hamil/${pregnantMotherId}`);
}

export async function softDeletePregnantMother(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const { supabase } = await requireActiveProfile();
  const { error } = await supabase.from('pregnant_mothers').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`Gagal menghapus data ibu hamil: ${error.message}`);
  revalidatePath('/ibu-hamil');
  revalidatePath('/laporan');
  redirect('/ibu-hamil');
}
