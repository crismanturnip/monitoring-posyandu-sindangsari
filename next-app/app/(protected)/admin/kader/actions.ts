'use server';

import { revalidatePath } from 'next/cache';
import { requireBidan } from '@/lib/auth';

export async function approveKader(formData: FormData) {
  const kaderId = String(formData.get('kaderId') ?? '');
  const posyanduId = String(formData.get('posyanduId') ?? '');
  const transferRequest = String(formData.get('transferRequest') ?? '') || null;
  if (!kaderId || !posyanduId) throw new Error('Pilih kader dan Posyandu.');
  const { supabase } = await requireBidan();
  const { error } = await supabase.rpc('assign_kader', { target_kader: kaderId, target_posyandu: posyanduId, transfer_request: transferRequest });
  if (error) throw new Error(`Penugasan belum berhasil: ${error.message}`);
  revalidatePath('/admin/kader');
  revalidatePath('/akun');
}

export async function rejectKader(formData: FormData) {
  const kaderId = String(formData.get('kaderId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();
  if (!kaderId || !reason) throw new Error('Pilih kader dan tulis alasan penolakan.');
  const { supabase } = await requireBidan();
  const { data, error } = await supabase.from('profiles').update({ account_status: 'REJECTED', rejection_reason: reason }).eq('id', kaderId).eq('account_status', 'PENDING').select('id').maybeSingle();
  if (error) throw new Error(`Penolakan belum berhasil: ${error.message}`);
  if (!data) throw new Error('Akun tidak lagi menunggu persetujuan.');
  revalidatePath('/admin/kader');
}

export async function rejectTransfer(formData: FormData) {
  const id = String(formData.get('transferRequest') ?? '');
  if (!id) throw new Error('Permintaan pindah tidak ditemukan.');
  const { supabase } = await requireBidan();
  const { error } = await supabase.rpc('reject_kader_transfer', { transfer_request: id });
  if (error) throw new Error(`Permintaan belum berhasil ditolak: ${error.message}`);
  revalidatePath('/admin/kader');
  revalidatePath('/akun');
}

export async function editKaderProfile(formData: FormData) {
  const id = String(formData.get('kaderId') ?? '');
  const name = String(formData.get('fullName') ?? '').trim();
  const phone = String(formData.get('phoneNumber') ?? '').trim();
  if (!id || name.length < 2 || name.length > 100) throw new Error('Nama kader harus 2 sampai 100 karakter.');
  if (phone && !/^[+0-9 ()-]{8,25}$/.test(phone)) throw new Error('Nomor telepon tidak valid.');
  const { supabase } = await requireBidan();
  const { data, error } = await supabase.from('profiles').update({
    full_name: name, phone_number: phone || null,
  }).eq('id', id).eq('role', 'KADER').select('id').maybeSingle();
  if (error) throw new Error(`Profil kader belum berhasil diperbarui: ${error.message}`);
  if (!data) throw new Error('Kader tidak ditemukan.');
  revalidatePath('/admin/kader');
}
