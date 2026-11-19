import Link from 'next/link';
import { signUp } from '../(auth)/actions';
import { PasswordInput } from '@/components/password-input';
import { AuthField, AuthNote, AuthShell, AuthSubmit } from '@/components/auth-shell';
import styles from '@/components/auth-shell.module.css';
import { createPublicSupabaseClient } from '@/lib/supabase/public';

type RegisterPageProps = { searchParams: Promise<{ error?: string }> };

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const { data: posyandu, error: posyanduError } = await createPublicSupabaseClient().rpc('registration_posyandu');
  return <AuthShell registration showBackLink={false} theme="teal"><form action={signUp}>
    <h1>Registrasi kader</h1><p>Pilih Posyandu tempat Anda ingin bertugas. Bidan akan meninjau permintaan setelah email Anda terverifikasi.</p>
    {params.error && <div className="form-error" role="alert">{params.error}</div>}
    {posyanduError && <div className="form-error" role="alert">Daftar Posyandu belum dapat dimuat. Coba lagi sebentar.</div>}
    <div className={styles.fields}>
      <AuthField label="Nama lengkap" icon="user"><input name="fullName" autoComplete="name" required minLength={2} /></AuthField>
      <AuthField label="Email" icon="mail"><input name="email" type="email" autoComplete="email" required /></AuthField>
      <label className="registration-posyandu-field">Posyandu yang ingin dituju
        <select name="requestedPosyanduId" required defaultValue="">
          <option value="" disabled>Pilih Posyandu aktif</option>
          {(posyandu ?? []).map((item: { id: string; name: string }) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <AuthField label="Kata sandi" icon="lock"><PasswordInput name="password" autoComplete="new-password" required minLength={8} /></AuthField>
      <AuthField label="Konfirmasi kata sandi" icon="lock"><PasswordInput name="confirmPassword" autoComplete="new-password" required minLength={8} /></AuthField>
    </div>
    <AuthSubmit>Kirim registrasi</AuthSubmit>
    <AuthNote><p><strong>Setelah mendaftar</strong></p><p>Periksa email untuk verifikasi. Bidan kemudian menyetujui akun dan menetapkan Posyandu tugas Anda.</p></AuthNote>
  </form>
    <div className={styles.divider}><span>atau</span></div>
    <div className={styles.alternative}><p>Sudah memiliki akun?</p><Link className={styles.secondaryButton} href="/login">Masuk</Link></div>
  </AuthShell>;
}
