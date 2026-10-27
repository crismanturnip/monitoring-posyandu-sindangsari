import type { Metadata } from 'next';
import './globals.css';
import { ApplicationFrame } from '@/components/application-frame';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Monitoring Posyandu Desa Sindangsari',
  description: 'Sistem informasi dan monitoring Posyandu Desa Sindangsari',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  let frameProfile: { full_name: string; role: 'BIDAN' | 'KADER' } | null = null;
  if (user) {
    const { data } = await supabase.rpc('get_current_profile').single();
    const profile = data as { full_name?: string; role?: 'BIDAN' | 'KADER'; account_status?: string } | null;
    if (profile?.account_status === 'ACTIVE' && profile.full_name && profile.role) frameProfile = { full_name: profile.full_name, role: profile.role };
  }
  return (
    <html lang="id">
      <body><ApplicationFrame profile={frameProfile}>{children}</ApplicationFrame></body>
    </html>
  );
}
