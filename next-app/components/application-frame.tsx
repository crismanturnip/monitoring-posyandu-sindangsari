'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

type FrameProfile = { full_name: string; role: 'BIDAN' | 'KADER' } | null;

const publicPaths = new Set(['/login', '/register', '/forgot-password', '/update-password', '/jadwal-publik']);
const primaryItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/balita', label: 'Bayi & Balita' },
  { href: '/ibu-hamil', label: 'Ibu Hamil' },
  { href: '/lansia', label: 'Lansia' },
  { href: '/jadwal', label: 'Jadwal Kegiatan' },
  { href: '/laporan', label: 'Laporan' },
  { href: '/akun', label: 'Akun Saya' },
];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export function ApplicationFrame({ profile, children }: { profile: FrameProfile; children: ReactNode }) {
  const pathname = usePathname();
  const isPublic = publicPaths.has(pathname) || pathname.startsWith('/auth/');
  if (!profile || isPublic) return children;

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">P</div><div><strong>Monitoring Posyandu</strong><span>Desa Sindangsari</span></div></div>
      <div className="nav-label">Menu utama</div>
      <nav>
        {primaryItems.map((item) => <Link className={`nav-item${isActive(pathname, item.href) ? ' active' : ''}`} href={item.href} key={item.href}>{item.label}</Link>)}
        {profile.role === 'BIDAN' && <>
          <div className="nav-label">Administrasi</div>
          <Link className={`nav-item${isActive(pathname, '/admin/posyandu') ? ' active' : ''}`} href="/admin/posyandu">Posyandu</Link>
          <Link className={`nav-item${isActive(pathname, '/admin/kader') ? ' active' : ''}`} href="/admin/kader">Persetujuan Kader</Link>
        </>}
      </nav>
      <div className="sidebar-user"><span>{profile.full_name.slice(0, 1).toUpperCase()}</span><div><strong>{profile.full_name}</strong><small>{profile.role === 'BIDAN' ? 'Bidan' : 'Kader'}</small></div></div>
    </aside>
    <div className="main">{children}</div>
  </div>;
}
