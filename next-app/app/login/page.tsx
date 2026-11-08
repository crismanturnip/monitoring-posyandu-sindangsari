import Link from 'next/link';
import { signIn } from '../(auth)/actions';
import { PasswordInput } from '@/components/password-input';
import { AuthField, AuthShell, AuthSubmit } from '@/components/auth-shell';
import styles from '@/components/auth-shell.module.css';

type LoginPageProps = { searchParams: Promise<{ error?: string; registered?: string; password_updated?: string }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  return <AuthShell showBackLink={false}><form action={signIn}>
    <h1>Masuk ke sistem</h1><p>Gunakan akun bidan atau kader yang sudah aktif</p>
    {params.error && <div className="form-error" role="alert">{params.error}</div>}
    {params.registered && <div className="form-success">Registrasi diterima, tunggu persetujuan bidan sebelum masuk</div>}
    {params.password_updated && <div className="form-success">Kata sandi berhasil diperbarui, silakan masuk kembali</div>}
    <AuthField label="Email" icon="mail"><input name="email" type="email" autoComplete="email" required /></AuthField>
    <AuthField label="Kata sandi" icon="lock"><PasswordInput name="password" autoComplete="current-password" required /></AuthField>
    <div className={styles.forgot}><Link href="/forgot-password">Lupa kata sandi?</Link></div>
    <AuthSubmit>Masuk</AuthSubmit>
  </form>
    <div className={styles.divider}><span>atau</span></div>
    <div className={styles.alternative}>
      <p>Belum memiliki akun?</p>
      <div className={styles.alternativeActions}>
        <Link className={styles.secondaryButton} href="/">Kembali ke beranda</Link>
        <Link className={styles.secondaryButton} href="/register">Daftar sebagai kader</Link>
      </div>
    </div>
  </AuthShell>;
}
