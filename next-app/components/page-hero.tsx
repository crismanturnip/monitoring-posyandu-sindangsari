import { LogoutButton } from '@/components/logout-button';

type HeroProfile = { full_name: string; role: 'BIDAN' | 'KADER' };

export function PageHero({ profile, pageTitle, pageDescription, compact = false }: { profile: HeroProfile; pageTitle: string; pageDescription?: string; compact?: boolean }) {
  const roleLabel = profile.role === 'BIDAN' ? 'Bidan Desa' : 'Kader Posyandu';
  const roleBadge = profile.role === 'BIDAN' ? 'Bidan Desa Aktif' : 'Kader Posyandu Aktif';
  const today = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date());

  const userInitial = profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U';
  const pageHeading = (
    <div className="stitch-hero-page-title">
      <h1 className="stitch-page-title-text">{pageTitle}</h1>
      {pageDescription && <p className="stitch-page-title-desc">{pageDescription}</p>}
    </div>
  );

  return (
    <header className={`stitch-hero${compact ? ' stitch-hero-compact' : ''}`}>
      <div className="stitch-hero-ambient" aria-hidden="true" />

      {/* Organic Botanical Leaf Impressions Backdrop */}
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
        {compact ? pageHeading : <div className="stitch-hero-location">
          <span className="stitch-location-dot" />
          <span className="stitch-location-name">POSYANDU DESA SINDANGSARI</span>
          <span className="stitch-location-badge">{roleBadge}</span>
        </div>}

        <div className="stitch-hero-actions">
          <div className="stitch-date-pill">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{today}</span>
          </div>

          <div className="stitch-profile-pill">
            <div className="stitch-avatar">{userInitial}</div>
            <div className="stitch-profile-meta">
              <strong>{profile.full_name}</strong>
              <small>{roleLabel}</small>
            </div>
            <LogoutButton className="stitch-logout-btn" />
          </div>
        </div>
      </div>

      {/* Page Title */}
      {!compact && pageHeading}
    </header>
  );
}
