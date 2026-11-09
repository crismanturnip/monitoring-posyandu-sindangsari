import Link from 'next/link';
import { requireActiveProfile } from '@/lib/auth';
import { changePassword } from '@/app/(auth)/actions';
import { LogoutButton } from '@/components/logout-button';
import { PasswordInput } from '@/components/password-input';

type Props = { searchParams: Promise<{ error?: string; success?: string }> };

export default async function AccountPage({ searchParams }: Props) {
  const { profile } = await requireActiveProfile();
  const message = await searchParams;

  const todayFormatted = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date());

  const userInitial = profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U';
  const roleTitle = profile.role === 'BIDAN' ? 'Bidan Desa' : 'Kader Posyandu';
  const sessionRole = profile.role === 'BIDAN' ? 'Bidan Koordinator' : 'Kader Posyandu';

  return (
    <div className="stitch-dashboard">
      {/* Top Teal Hero Banner with Botanical Leaf Accents */}
      <header className="stitch-hero">
        <div className="stitch-hero-ambient" aria-hidden="true" />

        {/* Organic Leaf Impressions Backdrop */}
        <div className="stitch-hero-leaf-backdrop" aria-hidden="true">
          <svg viewBox="0 0 600 360" fill="none" xmlns="http://www.w3.org/2000/svg" className="stitch-leaf-svg" preserveAspectRatio="xMidYMid slice">
            <path d="M260 90 C410 40, 540 120, 500 260 C470 330, 340 330, 240 290 C170 260, 190 140, 260 90 Z" fill="rgba(0, 35, 30, 0.08)" />

            <g opacity="0.14" transform="translate(240, -10) rotate(18)">
              <path d="M160 10 C240 60, 290 150, 270 240 C250 310, 180 340, 110 330 C40 320, 10 240, 30 150 C50 70, 100 20, 160 10 Z" fill="rgba(255, 255, 255, 0.55)" />
              <path d="M160 10 Q150 170 110 330" stroke="white" strokeWidth="3" strokeLinecap="round" />
              <path d="M152 70 Q190 90 220 105" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <path d="M148 120 Q200 145 240 165" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <path d="M140 175 Q200 200 235 230" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <path d="M130 230 Q180 255 205 285" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <path d="M154 75 Q110 95 80 110" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <path d="M145 130 Q90 155 55 175" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <path d="M136 185 Q80 215 50 245" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <path d="M125 240 Q85 270 70 295" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </g>

            <g opacity="0.10" transform="translate(420, 70) rotate(-22) scale(0.75)">
              <path d="M140 10 C210 50, 250 130, 230 210 C210 270, 150 300, 90 290 C30 280, 10 210, 20 130 C40 60, 80 20, 140 10 Z" fill="rgba(255, 255, 255, 0.6)" />
              <path d="M140 10 Q130 150 90 290" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M133 70 Q170 90 200 105" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M127 120 Q175 145 205 165" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M118 175 Q165 200 190 230" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M135 75 Q95 95 70 110" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M125 130 Q75 155 45 175" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M115 185 Q70 215 40 245" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </g>

            <path d="M140 330 C210 270, 310 240, 420 280 C490 305, 540 350, 600 370" stroke="rgba(255, 255, 255, 0.10)" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M310 245 C350 190, 400 150, 470 130" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
        </div>

        {/* Top bar inside hero */}
        <div className="stitch-hero-top">
          <div className="stitch-hero-location">
            <span className="stitch-location-dot" />
            <span className="stitch-location-name">POSYANDU DESA SINDANGSARI</span>
            <span className="stitch-location-badge">
              {profile.role === 'BIDAN' ? 'Bidan Desa Aktif' : 'Kader Posyandu Aktif'}
            </span>
          </div>

          <div className="stitch-hero-actions">
            <div className="stitch-date-pill">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>{todayFormatted}</span>
            </div>

            <div className="stitch-profile-pill">
              <div className="stitch-avatar">{userInitial}</div>
              <div className="stitch-profile-meta">
                <strong>{profile.full_name}</strong>
                <small>{roleTitle}</small>
              </div>
              <LogoutButton className="stitch-logout-btn" />
            </div>
          </div>
        </div>

        {/* Page Title */}
        <div className="stitch-hero-page-title">
          <h1 className="stitch-page-title-text">Akun Saya</h1>
          <p className="stitch-page-title-desc">Kelola keamanan dan informasi akun profil Anda.</p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="stitch-content stitch-account-content">
        {/* Breadcrumb line */}
        <div className="account-breadcrumb">
          PENGATURAN AKUN • DESA SINDANGSARI • PROFIL PENGGUNA
        </div>

        {/* Feedback Messages */}
        {message.error && (
          <div className="form-error account-alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{message.error}</span>
          </div>
        )}
        {message.success && (
          <div className="form-success account-alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{message.success}</span>
          </div>
        )}

        {/* Security Password Card */}
        <section className="account-security-card">
          <div className="security-card-header">
            <div className="security-shield-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <rect x="9" y="10" width="6" height="5" rx="1" />
              </svg>
            </div>
            <div>
              <h2 className="security-card-title">Ubah Kata Sandi (Keamanan)</h2>
              <p className="security-card-sub">
                Perbarui kata sandi secara berkala minimal 3 bulan sekali demi keamanan data pemeriksaan warga.
              </p>
            </div>
          </div>

          <form action={changePassword} className="account-password-form">
            {/* Field 1: Kata Sandi Saat Ini */}
            <div className="account-form-group">
              <div className="account-label-row">
                <label htmlFor="currentPassword">Kata Sandi Saat Ini</label>
                <Link href="/forgot-password" className="forgot-password-link">
                  Lupa sandi?
                </Link>
              </div>
              <PasswordInput
                id="currentPassword"
                name="currentPassword"
                autoComplete="current-password"
                placeholder="••••••••••••"
              />
            </div>

            {/* Field 2 & 3: Kata Sandi Baru & Konfirmasi Sandi Baru */}
            <div className="account-form-grid">
              <div className="account-form-group">
                <label htmlFor="newPassword">Kata Sandi Baru</label>
                <PasswordInput
                  id="newPassword"
                  name="password"
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Minimal 8 karakter"
                  required
                />
              </div>

              <div className="account-form-group">
                <label htmlFor="confirmPassword">Konfirmasi Sandi Baru</label>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Ulangi kata sandi baru"
                  required
                />
              </div>
            </div>

            {/* Password Strength Indicator */}
            <div className="password-strength-bar">
              <div className="strength-meta">
                <span className="strength-label">Kekuatan Sandi:</span>
                <span className="strength-bars">
                  <span className="bar filled" />
                  <span className="bar filled" />
                  <span className="bar filled" />
                  <span className="bar filled" />
                </span>
                <span className="strength-text">Kuat (Kombinasi Huruf, Angka &amp; Simbol)</span>
              </div>
              <span className="strength-updated">Terakhir Diubah: Berkala</span>
            </div>

            {/* Card Footer */}
            <div className="account-card-footer">
              <div className="security-note">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Gunakan minimal 8 karakter dengan kombinasi angka dan simbol.</span>
              </div>

              <div className="account-action-buttons">
                <Link href="/dashboard" className="account-cancel-btn">
                  Batal
                </Link>
                <button type="submit" className="account-submit-btn">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                  <span>Perbarui Kata Sandi</span>
                </button>
              </div>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
