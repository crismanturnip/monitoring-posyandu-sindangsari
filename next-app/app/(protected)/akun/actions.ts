'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireActiveProfile } from '@/lib/auth';

export async function updateAccountProfile(formData: FormData) {
  const name = String(formData.get('fullName') ?? '').trim();
  const phone = String(formData.get('phoneNumber') ?? '').trim();
  if (name.length < 2 || name.length > 100) redirect('/akun?error=Nama%20lengkap%20harus%202-100%20karakter.');
  if (phone && !/^[+0-9 ()-]{8,25}$/.test(phone)) redirect('/akun?error=Nomor%20telepon%20tidak%20valid.');

  const { supabase } = await requireActiveProfile();
  const { error } = await supabase.rpc('update_my_profile', { new_name: name, new_phone: phone });
  if (error) {
    console.error('update_profile_failed', { code: error.code });
    redirect('/akun?error=Profil%20belum%20berhasil%20disimpan.');
  }
  revalidatePath('/akun');
  revalidatePath('/dashboard');
  redirect('/akun?success=Profil%20berhasil%20diperbarui.');
}

export async function requestPosyanduTransfer(formData: FormData) {
  const target = String(formData.get('posyanduId') ?? '');
  const { profile, supabase } = await requireActiveProfile();
  if (profile.role !== 'KADER') redirect('/akun?error=Hanya%20kader%20yang%20dapat%20mengajukan%20pindah.');
  if (!/^[0-9a-f-]{36}$/i.test(target)) redirect('/akun?error=Pilih%20Posyandu%20tujuan.');

  const { error } = await supabase.rpc('request_kader_transfer', { target_posyandu: target });
  if (error) {
    console.error('transfer_request_failed', { code: error.code });
    redirect('/akun?error=Permintaan%20pindah%20belum%20tersimpan.%20Periksa%20apakah%20sudah%20ada%20permintaan%20menunggu.');
  }
  revalidatePath('/akun');
  revalidatePath('/admin/kader');
  redirect('/akun?success=Permintaan%20pindah%20telah%20dikirim%20kepada%20bidan.');
}
