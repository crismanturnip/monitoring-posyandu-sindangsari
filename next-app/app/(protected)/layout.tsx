import { ApplicationFrame } from '@/components/application-frame';
import { requireActiveProfile } from '@/lib/auth';

export default async function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { profile, supabase } = await requireActiveProfile();
  let assignedPosyanduName: string | null = null;

  if (profile.role === 'KADER') {
    const { data, error } = await supabase.from('kader_assignments')
      .select('posyandu!kader_assignments_posyandu_id_fkey(name)')
      .eq('kader_id', profile.id)
      .is('ended_at', null)
      .maybeSingle();
    if (error) throw new Error(`Gagal memuat Posyandu tugas kader: ${error.message}`);
    const assignment = data as unknown as { posyandu: { name: string } | null } | null;
    assignedPosyanduName = assignment?.posyandu?.name ?? null;
  }

  return <ApplicationFrame profile={profile} assignedPosyanduName={assignedPosyanduName}>{children}</ApplicationFrame>;
}
