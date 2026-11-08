import Link from 'next/link';
import type { ReactNode } from 'react';
import { PosyanduLogo } from './posyandu-logo';
import styles from './auth-shell.module.css';

type IconName = 'mail' | 'lock' | 'user' | 'arrow' | 'back' | 'info' | 'measure' | 'record' | 'care';

export function AuthIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m3 7 9 6 9-6" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
    user: <><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2Z" /></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    back: <path d="M20 12H4m6-6-6 6 6 6" />,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10h.01" /></>,
    measure: <><path d="m3 15 12-12 6 6L9 21Z" /><path d="m13 5 3 3m-6 0 2 2m-5 1 3 3m-6 0 2 2" /></>,
    record: <><rect x="5" y="5" width="14" height="16" rx="2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 11h6M9 15h6" /></>,
    care: <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z" />,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function AuthField({ label, icon, children }: { label: string; icon: IconName; children: ReactNode }) {
  return <label className={styles.field}>{label}<span className={styles.inputWrap}><span className={styles.inputIcon}><AuthIcon name={icon} /></span>{children}</span></label>;
}

export function AuthSubmit({ children }: { children: ReactNode }) {
  return <button type="submit" className={styles.submit}>{children}</button>;
}

export function AuthNote({ children }: { children: ReactNode }) {
  return <div className={styles.note}><AuthIcon name="info" /><div>{children}</div></div>;
}

const serviceSteps: { title: string; description: string; icon: IconName }[] = [
  { title: 'Pendaftaran', description: 'Pendataan warga sesuai kelompok layanan', icon: 'user' },
  { title: 'Pengukuran', description: 'Pemantauan pertumbuhan dan kondisi kesehatan', icon: 'measure' },
  { title: 'Pencatatan', description: 'Hasil pemeriksaan tersimpan secara digital', icon: 'record' },
  { title: 'Pelayanan kesehatan', description: 'Pendampingan dan tindak lanjut oleh petugas', icon: 'care' },
];

export function AuthShell({ registration = false, contentLabel, showBackLink = true, children }: { registration?: boolean; contentLabel?: string; showBackLink?: boolean; children: ReactNode }) {
  return <main className={styles.page}>
    <header className={styles.identity}>
      <Link className={styles.brand} href="/" aria-label="Monitoring Posyandu, beranda"><PosyanduLogo id="auth" /><div><strong>Monitoring Posyandu</strong><span>Desa Sindangsari</span></div></Link>
      {showBackLink && <Link className={styles.back} href="/" aria-label="Kembali ke beranda"><span><span className={styles.backPrefix}>Kembali ke </span>Beranda</span></Link>}
    </header>
    <div className={styles.container}>
      <div className={styles.card}>
        <section className={styles.content} aria-label={contentLabel ?? (registration ? 'Pendaftaran kader' : 'Masuk petugas')}>
          <div className={styles.formArea}>
            <div className={styles.formContent}>{children}</div>
          </div>
        </section>
        <aside className={styles.art} aria-hidden="true">
          <div className={styles.artCaption}><span className={styles.artEyebrow}>POSYANDU DESA SINDANGSARI</span><strong>Tumbuh sehat bersama,<br />terpantau setiap bulan.</strong><p>Pencatatan dan pemantauan kesehatan masyarakat dalam satu sistem.</p></div>
          <div className={styles.location}><i />Desa Sindangsari<span>Monitoring Posyandu</span></div>
        </aside>
      </div>
    </div>
  </main>;
}
