import Link from 'next/link';
import { signIn } from '../(auth)/actions';

type LoginPageProps = { searchParams: Promise<{ error?: string; registered?: string; password_updated?: string }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  return <main className="auth-page"><form action={signIn} className="auth-card">
    <div className="brand"><div className="brand-mark">P</div><div><strong>Monitoring Posyandu</strong><span>Desa Sindangsari</span></div></div>
    <h1>Masuk ke sistem</h1><p>Gunakan akun bidan atau kader yang sudah aktif.</p>
    {params.error && <div className="form-error" role="alert">{params.error}</div>}
    {params.registered && <div className="form-success">Registrasi diterima. Tunggu persetujuan bidan sebelum masuk.</div>}
    {params.password_updated && <div className="form-success">Kata sandi berhasil diperbarui. Silakan masuk kembali.</div>}
    <label>Email<input name="email" type="email" autoComplete="email" required /></label>
    <label>Kata sandi<input name="password" type="password" autoComplete="current-password" required /></label>
    <button type="submit">Masuk</button>
    <p className="auth-footer"><Link href="/forgot-password">Lupa kata sandi?</Link></p>
    <p className="auth-footer">Belum memiliki akun? <Link href="/register">Daftar sebagai kader</Link></p>
  </form></main>;
}
