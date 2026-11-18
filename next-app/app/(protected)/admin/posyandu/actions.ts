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
  const sources = [
    { table: 'children', label: 'data bayi/balita' },
    { table: 'pregnant_mothers', label: 'data ibu hamil' },
    { table: 'elderly_people', label: 'data lansia' },
    { table: 'schedules', label: 'jadwal' },
    { table: 'kader_assignments', label: 'riwayat penugasan kader' },
  ] as const;
  const checks = await Promise.all(sources.map(({ table }) =>
    supabase.from(table).select('id', { count: 'exact', head: true }).eq('posyandu_id', id),
  ));
  if (checks.some(({ error }) => error)) {
    redirect(`/admin/posyandu?error=${encodeURIComponent('Keterkaitan data Posyandu gagal diperiksa. Coba lagi sebelum menghapus.')}`);
  }

  const linked = sources.flatMap(({ label }, index) => {
    const count = checks[index].count ?? 0;
    return count > 0 ? [`${count} ${label}`] : [];
  });
  if (linked.length > 0) {
    const reason = `Posyandu tidak dapat dihapus karena masih terkait dengan ${linked.join(', ')}. Data yang diarsipkan dan penugasan yang sudah berakhir juga tetap tercatat. Gunakan Nonaktifkan jika Posyandu tidak lagi digunakan.`;
    redirect(`/admin/posyandu?error=${encodeURIComponent(reason)}`);
  }

  const { error } = await supabase.from('posyandu').delete().eq('id', id);
  if (error) redirect(`/admin/posyandu?error=${encodeURIComponent('Posyandu gagal dihapus: ' + error.message)}`);
  
  revalidatePath('/admin/posyandu');
  revalidatePath('/');
  redirect('/admin/posyandu?success=Data%20Posyandu%20berhasil%20dihapus.');
}
