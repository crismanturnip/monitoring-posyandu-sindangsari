'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

type FrameProfile = { full_name: string; role: 'BIDAN' | 'KADER' } | null;

const publicPaths = new Set(['/', '/login', '/register', '/forgot-password', '/update-password', '/jadwal-publik']);

const primaryItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/balita', label: 'Bayi & Balita', icon: 'circle' },
  { href: '/ibu-hamil', label: 'Ibu Hamil', icon: 'circle' },
  { href: '/lansia', label: 'Lansia', icon: 'circle' },
  { href: '/jadwal', label: 'Jadwal Kegiatan', icon: 'circle' },
  { href: '/laporan', label: 'Laporan', icon: 'circle' },
  { href: '/akun', label: 'Akun Saya', icon: 'circle' },
];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

function NavIcon({ type }: { type: string }) {
  if (type === 'dashboard') {
    return (
      <svg className="nav-svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    );
  }
  return (
    <svg className="nav-svg-icon nav-svg-dot" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
    </svg>
  );
}

export function ApplicationFrame({ profile, children }: { profile: FrameProfile; children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [pathname]);
  const isPublic = publicPaths.has(pathname) || pathname.startsWith('/auth/');
  if (!profile || isPublic) return children;

  return (
    <div className="shell">
      <button
        className="menu-toggle"
        type="button"
        aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((current) => !current)}
      >
        <span />
        <span />
        <span />
      </button>
      {menuOpen && <button className="menu-backdrop" type="button" aria-label="Tutup menu" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar${menuOpen ? ' open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">P</div>
          <div>
            <strong>Monitoring Posyandu</strong>
            <span>Desa Sindangsari</span>
          </div>
        </div>
        <div className="nav-label">Menu utama</div>
        <nav>
          {primaryItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link className={`nav-item${active ? ' active' : ''}`} href={item.href} key={item.href}>
                <NavIcon type={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          {profile.role === 'BIDAN' && (
            <>
              <div className="nav-label">Administrasi</div>
              <Link className={`nav-item${isActive(pathname, '/admin/posyandu') ? ' active' : ''}`} href="/admin/posyandu">
                <NavIcon type="circle" />
                <span>Posyandu</span>
              </Link>
              <Link className={`nav-item${isActive(pathname, '/admin/kader') ? ' active' : ''}`} href="/admin/kader">
                <NavIcon type="circle" />
                <span>Persetujuan Kader</span>
              </Link>
            </>
          )}
        </nav>
        <div className="sidebar-user">
          <span>{profile.full_name.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{profile.full_name}</strong>
            <small>{profile.role === 'BIDAN' ? 'Bidan' : 'Kader'}</small>
          </div>
        </div>
      </aside>
      <div className="main">{children}</div>
    </div>
  );
}
