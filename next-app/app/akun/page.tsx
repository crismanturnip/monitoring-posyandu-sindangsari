import { requireActiveProfile } from '@/lib/auth';
import { changePassword } from '@/app/(auth)/actions';
import { LogoutButton } from '@/components/logout-button';
import { PasswordInput } from '@/components/password-input';

type Props = { searchParams: Promise<{ error?: string; success?: string }> };

export default async function AccountPage({ searchParams }: Props) {
  const { profile } = await requireActiveProfile();
  const message = await searchParams;
  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">Pengaturan akun</p><h1>Akun Saya</h1><p>Kelola keamanan akun {profile.full_name}.</p></div><div className="profile"><div className="avatar">{profile.full_name[0]}</div><span>{profile.full_name}</span><LogoutButton /></div></header>
    <section className="card account-card"><h2>Ganti kata sandi</h2><p className="muted-copy">Setelah disimpan, kata sandi baru langsung digunakan untuk login berikutnya.</p>
      {message.error && <div className="form-error">{message.error}</div>}
      {message.success && <div className="form-success">{message.success}</div>}
      <form className="stacked-form" action={changePassword}>
        <label>Kata sandi baru<PasswordInput name="password" autoComplete="new-password" minLength={8} required /></label>
        <label>Konfirmasi kata sandi<PasswordInput name="confirmPassword" autoComplete="new-password" minLength={8} required /></label>
        <button type="submit">Perbarui kata sandi</button>
      </form>
    </section>
  </main>;
}
