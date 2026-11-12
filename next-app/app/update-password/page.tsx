import Link from 'next/link';
import { updateRecoveredPassword } from '@/app/(auth)/actions';
import { PasswordInput } from '@/components/password-input';

type Props = { searchParams: Promise<{ error?: string }> };

export default async function UpdatePasswordPage({ searchParams }: Props) {
  const { error } = await searchParams;
  return <main className="auth-page"><section className="auth-card">
    <div className="brand"><div className="brand-mark">P</div><div><strong>Monitoring Posyandu</strong><span>Desa Sindang Sari</span></div></div>
    <h1>Buat kata sandi baru</h1>
    <p>Gunakan sedikitnya 8 karakter dan jangan gunakan kata sandi lama.</p>
    {error && <div className="form-error">{error}</div>}
    <form action={updateRecoveredPassword}>
      <label>Kata sandi baru<PasswordInput name="password" autoComplete="new-password" minLength={8} required /></label>
      <label>Konfirmasi kata sandi<PasswordInput name="confirmPassword" autoComplete="new-password" minLength={8} required /></label>
      <button type="submit">Simpan kata sandi</button>
    </form>
    <p className="auth-footer"><Link href="/forgot-password">Minta tautan baru</Link></p>
  </section></main>;
}
