'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireActiveProfile, requireBidan } from '@/lib/auth';
import { isValidRecordDate, jakartaDate } from '@/lib/health-record-dates';
import { examinationNotes } from '@/lib/examination-notes';

export async function createElderlyPerson(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const posyanduId = String(formData.get('posyanduId') ?? '');
  if (!name || !posyanduId) throw new Error('Nama lansia dan Posyandu wajib diisi.');
  const notes = examinationNotes(formData, 'lansia');
  const examinedAt = String(formData.get('examinedAt') ?? jakartaDate());
  if (notes && !isValidRecordDate(examinedAt)) throw new Error('Isi tanggal pemeriksaan yang valid.');
  const { profile, supabase } = await requireActiveProfile();
  const { data, error } = await supabase.from('elderly_people').insert({ name, posyandu_id: posyanduId }).select('id').single();
  if (error) throw new Error(`Gagal menyimpan data lansia: ${error.message}`);
  if (!data) throw new Error('Data lansia tidak berhasil disimpan.');
  revalidatePath('/lansia');

  revalidatePath('/laporan');
  if (notes) {
    const { error: examinationError } = await supabase.from('elderly_examinations').insert({
      elderly_person_id: data.id,
      examined_at: examinedAt,
      officer_notes: notes,
      recorded_by: profile.id,
    });
    if (examinationError) redirect(`/lansia/${data.id}?examination=failed`);
    revalidatePath('/laporan');
  }

  redirect(`/lansia/${data.id}`);
}

export async function updateElderlyPerson(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  if (!id || !name) throw new Error('Pilih lansia dan isi nama lengkap.');
  const notes = examinationNotes(formData, 'lansia');
  const examinedAt = String(formData.get('examinedAt') ?? jakartaDate());
  if (notes && !isValidRecordDate(examinedAt)) throw new Error('Isi tanggal pemeriksaan yang valid.');
  const { profile, supabase } = await requireActiveProfile();
  const posyanduId = String(formData.get('posyanduId') ?? '');
  const updatePayload: Record<string, string> = { name };
  if (posyanduId) updatePayload.posyandu_id = posyanduId;
  const { data: updated, error: updateError } = await supabase.from('elderly_people').update(updatePayload).eq('id', id).select('id').maybeSingle();
  if (updateError) throw new Error(`Gagal memperbarui data lansia: ${updateError.message}`);
  if (!updated) throw new Error('Data lansia tidak ditemukan atau tidak dapat diakses.');

  if (notes) {
    // Examination history permits inserts, not updates: preserve the previous record.
    const { error: examinationError } = await supabase.from('elderly_examinations').insert({
      elderly_person_id: id,
      examined_at: examinedAt,
      officer_notes: notes,
      recorded_by: profile.id,
    });
    if (examinationError) throw new Error(`Data lansia diperbarui, tetapi pemeriksaan gagal disimpan: ${examinationError.message}`);
  }

  revalidatePath('/lansia');
  revalidatePath(`/lansia/${id}`);
  revalidatePath('/laporan');
}

export async function addElderlyExamination(formData: FormData) {
  const elderlyPersonId = String(formData.get('elderlyPersonId') ?? '');
  const examinedAt = String(formData.get('examinedAt') ?? '');
  if (!elderlyPersonId || !isValidRecordDate(examinedAt)) throw new Error('Pilih lansia dan tanggal pemeriksaan yang valid.');
  const { profile, supabase } = await requireActiveProfile();
  const { error } = await supabase.from('elderly_examinations').insert({ elderly_person_id: elderlyPersonId, examined_at: examinedAt, officer_notes: String(formData.get('notes') ?? '').trim() || null, recorded_by: profile.id });
  if (error) throw new Error(`Gagal menyimpan pemeriksaan lansia: ${error.message}`);
  revalidatePath(`/lansia/${elderlyPersonId}`);
  revalidatePath('/lansia');
  revalidatePath('/laporan');
  redirect(`/lansia/${elderlyPersonId}`);
}

export async function softDeleteElderlyPerson(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const { supabase } = await requireBidan();
  const { error } = await supabase.from('elderly_people').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`Gagal menghapus data lansia: ${error.message}`);
  revalidatePath('/lansia');
  revalidatePath('/laporan');
  redirect('/lansia');
}
