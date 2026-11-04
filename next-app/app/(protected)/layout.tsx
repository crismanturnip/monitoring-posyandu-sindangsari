import { ApplicationFrame } from '@/components/application-frame';
import { requireActiveProfile } from '@/lib/auth';

export default async function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { profile } = await requireActiveProfile();
  return <ApplicationFrame profile={profile}>{children}</ApplicationFrame>;
}
