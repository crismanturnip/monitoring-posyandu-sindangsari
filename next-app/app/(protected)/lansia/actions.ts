'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireActiveProfile, requireBidan } from '@/lib/auth';

export async function createElderlyPerson(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const posyanduId = String(formData.get('posyanduId') ?? '');
  if (!name || !posyanduId) return;
  const { profile, supabase } = await requireActiveProfile();
  const { data, error } = await supabase.from('elderly_people').insert({ name, posyandu_id: posyanduId }).select('id').single();
  if (error || !data) return;

  const notes = String(formData.get('notes') ?? '').trim();
  const td = String(formData.get('bloodPressure') ?? '').trim();
  const gds = String(formData.get('bloodSugar') ?? '').trim();
  const aks = String(formData.get('aks') ?? '').trim();
  const summaryParts: string[] = [];
  if (td) summaryParts.push(`TD: ${td} mmHg`);
  if (gds) summaryParts.push(`GDS: ${gds} mg/dL`);
  if (aks) summaryParts.push(`Kemandirian: ${aks}`);
  if (notes) summaryParts.push(notes);

  if (summaryParts.length > 0) {
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('elderly_examinations').insert({
      elderly_person_id: data.id,
      examined_at: today,
      officer_notes: summaryParts.join(' • '),
      recorded_by: profile.id,
    });
  }

  revalidatePath('/lansia');
  redirect(`/lansia/${data.id}`);
}

export async function updateElderlyPerson(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  if (!id || !name) return;
  const { profile, supabase } = await requireActiveProfile();
  const posyanduId = String(formData.get('posyanduId') ?? '');
  const updatePayload: Record<string, string> = { name };
  if (posyanduId) updatePayload.posyandu_id = posyanduId;
  await supabase.from('elderly_people').update(updatePayload).eq('id', id);

  const notes = String(formData.get('notes') ?? '').trim();
  if (notes) {
    const { data: latestExam } = await supabase
      .from('elderly_examinations')
      .select('id')
      .eq('elderly_person_id', id)
      .order('examined_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestExam?.id) {
      await supabase.from('elderly_examinations').update({ officer_notes: notes }).eq('id', latestExam.id);
    } else {
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('elderly_examinations').insert({
        elderly_person_id: id,
        examined_at: today,
        officer_notes: notes,
        recorded_by: profile.id,
      });
    }
  }

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
