import { LogoutButton } from '@/components/logout-button';

type HeroProfile = { full_name: string; role: 'BIDAN' | 'KADER' };

export function PageHero({ profile, description }: { profile: HeroProfile; description: string }) {
  const roleLabel = profile.role === 'BIDAN' ? 'Bidan' : 'Kader';
  const today = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date());

  return <header className="hero">
    <div className="hero-text">
      <div className="hero-tags">
        <span className="hero-eyebrow">Posyandu Desa Sindangsari</span>
        <span className="hero-badge">{roleLabel} Desa Aktif</span>
      </div>
      <h1>Selamat Datang, {profile.full_name}! 👋</h1>
      <p>{description}</p>
    </div>
    <div className="hero-actions">
      <div className="hero-chip">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
        {today}
      </div>
      <div className="hero-chip hero-profile">
        <div className="avatar">{profile.full_name[0]}</div>
        <div><strong>{profile.full_name}</strong><small>{roleLabel} Desa</small></div>
      </div>
      <LogoutButton />
    </div>
  </header>;
}
