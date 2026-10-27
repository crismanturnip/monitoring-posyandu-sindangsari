import Link from 'next/link';
import { signUp } from '../(auth)/actions';

type RegisterPageProps = { searchParams: Promise<{ error?: string }> };

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  return <main className="auth-page"><form action={signUp} className="auth-card">
    <div className="brand"><div className="brand-mark">P</div><div><strong>Monitoring Posyandu</strong><span>Desa Sindangsari</span></div></div>
    <h1>Registrasi kader</h1><p>Akun akan berstatus menunggu persetujuan bidan.</p>
    {params.error && <div className="form-error" role="alert">{params.error}</div>}
    <label>Nama lengkap<input name="fullName" autoComplete="name" required minLength={2} /></label>
    <label>Email<input name="email" type="email" autoComplete="email" required /></label>
    <label>Kata sandi<input name="password" type="password" autoComplete="new-password" required minLength={8} /></label>
    <label>Konfirmasi kata sandi<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} /></label>
    <button type="submit">Kirim registrasi</button>
    <p className="auth-footer">Sudah memiliki akun? <Link href="/login">Masuk</Link></p>
  </form></main>;
}
