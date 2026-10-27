import Link from 'next/link';
import { requestPasswordReset } from '@/app/(auth)/actions';

type Props = { searchParams: Promise<{ error?: string; sent?: string }> };

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const params = await searchParams;
  return <main className="auth-page"><section className="auth-card">
    <div className="brand"><div className="brand-mark">P</div><div><strong>Monitoring Posyandu</strong><span>Desa Sindangsari</span></div></div>
    <h1>Reset kata sandi</h1>
    <p>Masukkan email akun. Tautan pengaturan ulang akan dikirim melalui Supabase Auth.</p>
    {params.error && <div className="form-error">{params.error}</div>}
    {params.sent && <div className="form-success">Jika email terdaftar, tautan reset sudah dikirim. Periksa kotak masuk dan folder spam.</div>}
    <form action={requestPasswordReset}>
      <label>Email<input name="email" type="email" autoComplete="email" required /></label>
      <button type="submit">Kirim tautan reset</button>
    </form>
    <p className="auth-footer"><Link href="/login">Kembali ke login</Link></p>
  </section></main>;
}
