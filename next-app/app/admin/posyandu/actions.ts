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
