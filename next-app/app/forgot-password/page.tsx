import Link from 'next/link';
import { requestPasswordReset } from '@/app/(auth)/actions';
import { AuthField, AuthShell, AuthSubmit } from '@/components/auth-shell';
import styles from '@/components/auth-shell.module.css';

type Props = { searchParams: Promise<{ error?: string; sent?: string }> };

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const params = await searchParams;
  return <AuthShell contentLabel="Pemulihan kata sandi" showBackLink={false} theme="teal">
    <form action={requestPasswordReset}>
      <h1>Reset kata sandi</h1>
      <p>Masukkan email yang terdaftar. Kami akan mengirimkan tautan untuk mengatur ulang kata sandi.</p>
      {params.error && <div className="form-error" role="alert">{params.error}</div>}
      {params.sent && <div className="form-success" role="status" aria-live="polite">Jika email terdaftar, tautan reset sudah dikirim. Periksa kotak masuk dan folder spam.</div>}
      <AuthField label="Email" icon="mail"><input name="email" type="email" autoComplete="email" required /></AuthField>
      <AuthSubmit>Kirim tautan reset</AuthSubmit>
    </form>
    <div className={styles.divider}><span>atau</span></div>
    <div className={styles.alternative}><p>Sudah ingat kata sandinya?</p><Link className={styles.secondaryButton} href="/login">Kembali ke login</Link></div>
  </AuthShell>;
}
