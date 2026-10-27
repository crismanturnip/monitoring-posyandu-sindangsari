import Link from 'next/link';
import { requireActiveProfile } from '@/lib/auth';
import { changePassword } from '@/app/(auth)/actions';
import { LogoutButton } from '@/components/logout-button';

type Props = { searchParams: Promise<{ error?: string; success?: string }> };

export default async function AccountPage({ searchParams }: Props) {
  const { profile } = await requireActiveProfile();
  const message = await searchParams;
  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">Pengaturan akun</p><h1>Akun Saya</h1><p>Kelola keamanan akun {profile.full_name}.</p></div><div className="profile"><div className="avatar">{profile.full_name[0]}</div><span>{profile.full_name}</span><LogoutButton /></div></header>
    <nav className="admin-nav"><Link href="/">Dashboard</Link><Link href="/laporan">Laporan</Link><Link className="active" href="/akun">Akun</Link></nav>
    <section className="card account-card"><h2>Ganti kata sandi</h2><p className="muted-copy">Setelah disimpan, kata sandi baru langsung digunakan untuk login berikutnya.</p>
      {message.error && <div className="form-error">{message.error}</div>}
      {message.success && <div className="form-success">{message.success}</div>}
      <form className="stacked-form" action={changePassword}>
        <label>Kata sandi baru<input name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
        <label>Konfirmasi kata sandi<input name="confirmPassword" type="password" minLength={8} autoComplete="new-password" required /></label>
        <button type="submit">Perbarui kata sandi</button>
      </form>
    </section>
  </main>;
}
