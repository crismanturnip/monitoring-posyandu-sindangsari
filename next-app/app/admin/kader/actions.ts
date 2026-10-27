'use server';

import { revalidatePath } from 'next/cache';
import { requireBidan } from '@/lib/auth';

export async function approveKader(formData: FormData) {
  const kaderId = String(formData.get('kaderId') ?? '');
  const posyanduId = String(formData.get('posyanduId') ?? '');
  if (!kaderId || !posyanduId) return;
  const { profile, supabase } = await requireBidan();
  const now = new Date().toISOString();
  await supabase.from('profiles').update({ role: 'KADER', account_status: 'ACTIVE', approved_at: now, approved_by: profile.id, rejection_reason: null }).eq('id', kaderId);
  await supabase.from('kader_assignments').update({ ended_at: now }).eq('kader_id', kaderId).is('ended_at', null);
  await supabase.from('kader_assignments').insert({ kader_id: kaderId, posyandu_id: posyanduId, assigned_by: profile.id });
  revalidatePath('/admin/kader');
}

export async function rejectKader(formData: FormData) {
  const kaderId = String(formData.get('kaderId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();
  if (!kaderId || !reason) return;
  const { supabase } = await requireBidan();
  await supabase.from('profiles').update({ account_status: 'REJECTED', rejection_reason: reason }).eq('id', kaderId);
  revalidatePath('/admin/kader');
}
