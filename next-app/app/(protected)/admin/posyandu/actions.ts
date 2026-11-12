'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireBidan } from '@/lib/auth';

export async function createPosyandu(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const address = String(formData.get('address') ?? '').trim();
  if (name.length < 2) redirect('/admin/posyandu?error=Nama%20Posyandu%20minimal%202%20karakter.');

  const { supabase } = await requireBidan();
  const { error } = await supabase.from('posyandu').insert({ name, address: address || null });
  if (error) redirect('/admin/posyandu?error=Data%20Posyandu%20gagal%20disimpan.');
  revalidatePath('/admin/posyandu');
  revalidatePath('/');
  redirect('/admin/posyandu?success=Data%20Posyandu%20berhasil%20disimpan.');
}

export async function togglePosyandu(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const nextStatus = String(formData.get('nextStatus') ?? '') === 'true';
  if (!id) redirect('/admin/posyandu?error=Data%20Posyandu%20tidak%20valid.');

  const { supabase } = await requireBidan();
  const { error } = await supabase.from('posyandu').update({ is_active: nextStatus }).eq('id', id);
  if (error) redirect('/admin/posyandu?error=Status%20Posyandu%20gagal%20diubah.');
  revalidatePath('/admin/posyandu');
  revalidatePath('/');
  redirect('/admin/posyandu?success=Status%20Posyandu%20berhasil%20diubah.');
}

export async function deletePosyandu(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) redirect('/admin/posyandu?error=Data%20Posyandu%20tidak%20valid.');

  const { supabase } = await requireBidan();
  
  // Periksa apakah Posyandu masih memiliki keterkaitan data aktif
  const [childrenCheck, mothersCheck, elderlyCheck, schedulesCheck, kaderCheck] = await Promise.all([
    supabase.from('children').select('id', { count: 'exact', head: true }).eq('posyandu_id', id),
    supabase.from('pregnant_mothers').select('id', { count: 'exact', head: true }).eq('posyandu_id', id),
    supabase.from('elderly_people').select('id', { count: 'exact', head: true }).eq('posyandu_id', id),
    supabase.from('schedules').select('id', { count: 'exact', head: true }).eq('posyandu_id', id),
    supabase.from('kader_assignments').select('id', { count: 'exact', head: true }).eq('posyandu_id', id),
  ]);

  const totalLinked = (childrenCheck.count ?? 0) + 
                      (mothersCheck.count ?? 0) + 
                      (elderlyCheck.count ?? 0) + 
                      (schedulesCheck.count ?? 0) + 
                      (kaderCheck.count ?? 0);

  if (totalLinked > 0) {
    redirect('/admin/posyandu?error=Posyandu%20tidak%20dapat%20dihapus%20karena%20masih%20memiliki%20data%20terkait%20(warga/jadwal/kader).%20Gunakan%20opsi%20Nonaktifkan.');
  }

  const { error } = await supabase.from('posyandu').delete().eq('id', id);
  if (error) redirect(`/admin/posyandu?error=${encodeURIComponent('Posyandu gagal dihapus: ' + error.message)}`);
  
  revalidatePath('/admin/posyandu');
  revalidatePath('/');
  redirect('/admin/posyandu?success=Data%20Posyandu%20berhasil%20dihapus.');
}
