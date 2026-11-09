'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

type FrameProfile = { full_name: string; role: 'BIDAN' | 'KADER' } | null;

const publicPaths = new Set(['/', '/login', '/register', '/forgot-password', '/update-password', '/jadwal-publik']);

const primaryItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/balita', label: 'Bayi & Balita', icon: 'baby' },
  { href: '/ibu-hamil', label: 'Ibu Hamil', icon: 'pregnancy' },
  { href: '/lansia', label: 'Lansia', icon: 'elderly' },
  { href: '/jadwal', label: 'Jadwal Kegiatan', icon: 'calendar' },
  { href: '/laporan', label: 'Laporan', icon: 'report' },
  { href: '/akun', label: 'Akun Saya', icon: 'account' },
] as const;

const navIconPaths = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>,
  baby: <><circle cx="12" cy="12" r="8" /><path d="M12 4c0 2-3 2-3 0M8.5 11h.01M15.5 11h.01M9 15c1.5 2 4.5 2 6 0" /><path d="M4 10a2 2 0 0 0 0 4m16-4a2 2 0 0 1 0 4" /></>,
  pregnancy: <><circle cx="10" cy="4" r="2" /><path d="M7 21l1-6-1-4a3 3 0 0 1 3-3h1c2 0 3 2 3 4 3 0 5 2 5 4 0 2-2 3-5 3h-3l1 2M7 11l4 3h4" /></>,
  elderly: <><circle cx="9" cy="4" r="2" /><path d="M7 21l2-6-2-3 2-4 4 4h3M9 15l4 3v3M8 9l-4 4M16 21v-7a2 2 0 0 1 4 0" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2M8 18h2" /></>,
  report: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Zm0 0v6h6M8 17v-3M12 17v-5M16 17v-2" /></>,
  account: <><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
  posyandu: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M12 6v6M9 9h6M10 21v-5h4v5" /></>,
  approval: <><circle cx="9" cy="7" r="4" /><path d="M2 21v-2a7 7 0 0 1 12-4.9M16 12l2 2 4-4M15 21v-2" /></>,
} satisfies Record<string, ReactNode>;

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

function NavIcon({ type }: { type: keyof typeof navIconPaths }) {
  return (
    <svg className="nav-svg-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {navIconPaths[type]}
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
          <Image src="/logo-posyandu-sindangsari.png" alt="" width={44} height={44} sizes="44px" className="sidebar-logo" />
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
                <NavIcon type="posyandu" />
                <span>Posyandu</span>
              </Link>
              <Link className={`nav-item${isActive(pathname, '/admin/kader') ? ' active' : ''}`} href="/admin/kader">
                <NavIcon type="approval" />
                <span>Persetujuan Kader</span>
              </Link>
            </>
          )}
        </nav>
        <div className="sidebar-leaf-decor" aria-hidden="true">
          <svg viewBox="0 0 200 240" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M180 240 C140 180, 110 110, 130 40 C100 80, 60 130, 40 180 C20 220, 20 240, 180 240 Z" fill="rgba(255, 255, 255, 0.05)" />
            <path d="M130 40 Q110 140 30 240" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="2" strokeLinecap="round" />
            <path d="M118 90 Q80 110 50 130" stroke="rgba(255, 255, 255, 0.07)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M102 140 Q65 160 38 180" stroke="rgba(255, 255, 255, 0.07)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M85 190 Q55 210 32 230" stroke="rgba(255, 255, 255, 0.07)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
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
