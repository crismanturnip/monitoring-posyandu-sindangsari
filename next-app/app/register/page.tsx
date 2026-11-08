import Link from 'next/link';
import { signUp } from '../(auth)/actions';
import { PasswordInput } from '@/components/password-input';
import { AuthField, AuthNote, AuthShell, AuthSubmit } from '@/components/auth-shell';
import styles from '@/components/auth-shell.module.css';

type RegisterPageProps = { searchParams: Promise<{ error?: string }> };

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  return <AuthShell registration showBackLink={false}><form action={signUp}>
    <h1>Registrasi kader</h1><p>Akun akan berstatus menunggu persetujuan bidan.</p>
    {params.error && <div className="form-error" role="alert">{params.error}</div>}
    <div className={styles.fields}>
      <AuthField label="Nama lengkap" icon="user"><input name="fullName" autoComplete="name" required minLength={2} /></AuthField>
      <AuthField label="Email" icon="mail"><input name="email" type="email" autoComplete="email" required /></AuthField>
      <AuthField label="Kata sandi" icon="lock"><PasswordInput name="password" autoComplete="new-password" required minLength={8} /></AuthField>
      <AuthField label="Konfirmasi kata sandi" icon="lock"><PasswordInput name="confirmPassword" autoComplete="new-password" required minLength={8} /></AuthField>
    </div>
    <AuthSubmit>Kirim registrasi</AuthSubmit>
    <AuthNote><p><strong>Persetujuan akun</strong></p><p>Akun akan berstatus menunggu persetujuan bidan.</p></AuthNote>
  </form>
    <div className={styles.divider}><span>atau</span></div>
    <div className={styles.alternative}><p>Sudah memiliki akun?</p><Link className={styles.secondaryButton} href="/login">Masuk</Link></div>
  </AuthShell>;
}
