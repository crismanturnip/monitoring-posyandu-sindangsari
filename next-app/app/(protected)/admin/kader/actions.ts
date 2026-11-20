'use server';

import { revalidatePath } from 'next/cache';
import { requireBidan } from '@/lib/auth';

export async function approveKader(formData: FormData) {
  const kaderId = String(formData.get('kaderId') ?? '');
  const posyanduId = String(formData.get('posyanduId') ?? '');
  const transferRequest = String(formData.get('transferRequest') ?? '') || null;
  if (!kaderId || !posyanduId) throw new Error('Pilih kader dan Posyandu.');
  const { supabase } = await requireBidan();

  if (!transferRequest) {
    const { data: kader, error: profileError } = await supabase
      .from('profiles')
      .select('role, account_status, email_confirmed_at')
      .eq('id', kaderId)
      .maybeSingle();
    if (profileError) throw new Error('Status akun kader gagal diperiksa. Persetujuan belum diproses.');
    if (!kader || kader.role !== 'KADER') throw new Error('Akun kader tidak ditemukan.');
    if (kader.account_status === 'PENDING' && !kader.email_confirmed_at) {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error('Sesi Bidan tidak ditemukan. Silakan masuk ulang.');
      const { error: confirmationError } = await supabase.functions.invoke('confirm-kader-email', {
        body: { kaderId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (confirmationError) throw new Error('Email kader gagal dikonfirmasi oleh sistem. Persetujuan belum diproses.');
    }
  }

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

export type DeleteKaderState = { error: string | null; success: string | null };

export async function deleteKaderAccount(_previousState: DeleteKaderState, formData: FormData): Promise<DeleteKaderState> {
  const id = String(formData.get('kaderId') ?? '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return { error: 'Akun kader tidak valid.', success: null };
  }

  const { supabase } = await requireBidan();
  const { error } = await supabase.rpc('delete_kader_account', { target_kader: id });
  if (error) {
    return {
      error: error.code === 'P0001'
        ? error.message
        : 'Penghapusan gagal. Tidak ada perubahan yang disimpan. Coba lagi atau hubungi pengelola sistem.',
      success: null,
    };
  }

  revalidatePath('/admin/kader');
  revalidatePath('/akun');
  return { error: null, success: 'Akun kader berhasil dihapus permanen.' };
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
