import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type ActiveProfile = {
  id: string;
  full_name: string;
  role: 'BIDAN' | 'KADER';
  account_status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'INACTIVE';
};

export async function requireActiveProfile(): Promise<{ profile: ActiveProfile; supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase.rpc('get_current_profile').single();
  const profile = data as ActiveProfile | null;
  if (!profile || profile.account_status !== 'ACTIVE') redirect('/login?error=Akun%20Anda%20belum%20aktif.');
  return { profile, supabase };
}

export async function requireBidan() {
  const result = await requireActiveProfile();
  if (result.profile.role !== 'BIDAN') redirect('/');
  return result;
}
