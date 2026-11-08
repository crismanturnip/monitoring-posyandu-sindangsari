import Link from 'next/link';
import { PosyanduLogo } from '@/components/posyandu-logo';
import { PublicSchedulePreview } from '@/components/public-schedule-preview';
import { getPublicSchedules, type PublicSchedule } from '@/lib/public-schedules';
import './landing-clean.css';

export const revalidate = 60;

const TIME_ZONE = 'Asia/Jakarta';

async function loadSchedules(): Promise<PublicSchedule[]> {
  try {
    return await getPublicSchedules();
  } catch {
    // Landing page tetap tampil walau jadwal gagal dimuat.
    return [];
  }
}

function pickHighlighted(schedules: PublicSchedule[]) {
  const now = Date.now();
  const upcoming = schedules
    .filter((item) => item.status === 'TERJADWAL' && new Date(item.starts_at).getTime() >= now)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  if (upcoming.length > 0) return { items: upcoming, upcoming: true };
  const recent = [...schedules].sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
  return { items: recent.slice(0, 3), upcoming: false };
}

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('id-ID', { ...options, timeZone: TIME_ZONE });
const dayNumber = fmt({ day: '2-digit' });
const monthShort = fmt({ month: 'short' });
const fullDate = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const timeOnly = fmt({ hour: '2-digit', minute: '2-digit' });

const services = [
  {
    tone: 'green',
    title: 'Bayi & Balita',
    text: 'Penimbangan, pengukuran tinggi badan, dan pemantauan tumbuh kembang anak setiap bulan agar risiko stunting terdeteksi lebih awal',
    points: ['Berat & tinggi badan', 'Riwayat pengukuran', 'Imunisasi & vitamin'],
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M10.5 7.5h.01M13.5 7.5h.01M10.8 9.6c.7.5 1.7.5 2.4 0" /><path d="M6 21v-1a6 6 0 0 1 12 0v1" /></svg>
    ),
  },
  {
    tone: 'amber',
    title: 'Ibu Hamil',
    text: 'Kunjungan rutin untuk memantau kondisi kehamilan, tekanan darah, dan berat badan ibu bersama bidan desa',
    points: ['Riwayat kunjungan', 'Pemeriksaan rutin', 'Edukasi gizi ibu'],
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="4.5" r="2.5" /><path d="M9 21v-5l-1-4a3 3 0 0 1 3-4h0a3 3 0 0 1 3 2.2" /><path d="M13 10.5a3.5 3.5 0 1 1 0 6.5V21" /></svg>
    ),
  },
  {
    tone: 'blue',
    title: 'Lansia',
    text: 'Pemeriksaan kesehatan berkala bagi warga lanjut usia untuk menjaga kualitas hidup tetap aktif dan mandiri',
    points: ['Tekanan darah', 'Riwayat pemeriksaan', 'Konsultasi kesehatan'],
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="4.5" r="2.5" /><path d="M8 21l1.5-7L8 11l2-3.5 3 3 3 1" /><path d="M17 12v9" /><path d="M10.5 14l2.5 3v4" /></svg>
    ),
  },
] as const;

const steps = [
  { title: 'Pendaftaran', text: 'Warga datang dan didata oleh petugas sesuai kelompok sasaran' },
  { title: 'Penimbangan & Pengukuran', text: 'Berat badan, tinggi badan, dan kondisi fisik diukur' },
  { title: 'Pencatatan', text: 'Hasil pemeriksaan dicatat ke dalam sistem secara digital' },
  { title: 'Penyuluhan', text: 'Petugas memberi edukasi gizi dan pola hidup sehat untuk masyarakat' },
  { title: 'Pelayanan Kesehatan', text: 'Bidan memberikan layanan lanjutan bila diperlukan' },
];

const officerFeatures = [
  { title: 'Dashboard ringkas', text: 'Pantau jumlah balita, ibu hamil, dan lansia dalam satu layar' },
  { title: 'Riwayat lengkap', text: 'Setiap pengukuran dan kunjungan tersimpan rapi per warga' },
  { title: 'Laporan CSV & PDF', text: 'Ekspor laporan berdasarkan Posyandu dan rentang tanggal' },
  { title: 'Akses terkontrol', text: 'Akun kader disetujui bidan dan dibatasi sesuai Posyandu' },
];

function ArrowIcon() {
  return <svg className="lp-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

function PinIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>;
}

function ClockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
}

export default async function LandingPage() {
  const schedules = await loadSchedules();
  const { items, upcoming } = pickHighlighted(schedules);
  const previewSchedules = upcoming ? items : [...schedules]
    .filter((schedule) => schedule.status !== 'DIBATALKAN')
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
  const year = new Date().getFullYear();

  return (
    <div className="lp">
      <a className="lp-skip" href="#konten-utama">Lewati ke konten utama</a>
      <header className="lp-nav">
        <div className="lp-nav-inner">
          <Link className="brand lp-brand" href="/">
            <PosyanduLogo id="header" />
            <div><strong>Monitoring Posyandu</strong><span>Desa Sindangsari</span></div>
          </Link>
          <nav className="lp-links" aria-label="Navigasi utama">
            <a href="#layanan">Layanan</a>
            <a href="#jadwal">Jadwal</a>
            <a href="#alur">Alur Kegiatan</a>
          </nav>
          <Link className="lp-btn lp-btn-dark lp-btn-sm lp-nav-login" href="/login">Masuk</Link>
          <details className="lp-menu">
            <summary><span aria-hidden="true"><i /><i /><i /></span></summary>
            <nav aria-label="Navigasi seluler">
              <a href="#layanan">Layanan</a>
              <a href="#jadwal">Jadwal</a>
              <a href="#alur">Alur Kegiatan</a>
              <Link className="lp-menu-login" href="/login">Masuk</Link>
            </nav>
          </details>
        </div>
      </header>

      <main id="konten-utama">
        {/* Hero */}
        <section className="lp-hero">
          <div className="lp-hero-glow" aria-hidden="true" />
          <div className="lp-container lp-hero-grid">
            <div className="lp-hero-copy">
              <h1>Tumbuh sehat bersama, <em>terpantau pada</em> setiap bulan</h1>
              <p className="lp-lead">
                Informasi jadwal Posyandu  dan Sistem Pencatatan Digital untuk petugas kesehatan dalam memantau kesehatan masyarakat Desa Sindangsari
              </p>
              <div className="lp-cta-row">
                <a className="lp-btn lp-btn-primary" href="#jadwal">Lihat jadwal kegiatan </a>
                <Link className="lp-btn lp-btn-ghost" href="/login">Masuk sebagai petugas</Link>
              </div>
              <ul className="lp-trust">
                <li>Gratis untuk warga</li>
                <li>Tanpa perlu login</li>
                <li>Data pribadi terlindungi</li>
              </ul>
            </div>

            <div className="lp-hero-visual">
              <PublicSchedulePreview schedules={previewSchedules} upcoming={upcoming} />
            </div>
          </div>
        </section>

        {/* Layanan */}
        <section className="lp-section" id="layanan">
          <div className="lp-container">
            <div className="lp-section-head">
              <span className="lp-kicker">Layanan Posyandu</span>
              <h2>Pendampingan kesehatan untuk setiap Masyarakat</h2>
              <p>Posyandu hadir di tengah warga sebagai layanan kesehatan dasar yang dekat, ramah, dan berkelanjutan</p>
            </div>
            <div className="lp-services">
              {services.map((service) => (
                <article className={`lp-service ${service.tone}`} key={service.title}>
                  <div className="lp-service-icon">{service.icon}</div>
                  <h3>{service.title}</h3>
                  <p>{service.text}</p>
                  <ul>{service.points.map((point) => <li key={point}>{point}</li>)}</ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Jadwal */}
        <section className="lp-section lp-section-tint" id="jadwal">
          <div className="lp-container">
            <div className="lp-section-head lp-section-head-split">
              <div>
                <span className="lp-kicker">Jadwal Kegiatan</span>
                <h2>{upcoming ? 'Kegiatan Posyandu terdekat' : 'Kegiatan Posyandu terakhir'}</h2>
                <p>Datang tepat waktu dan bawa buku KIA atau kartu kesehatan Anda</p>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="lp-empty">
                <ClockIcon />
                <strong>Belum ada jadwal yang dipublikasikan</strong>
                <span>Jadwal kegiatan akan muncul di sini setelah diumumkan oleh petugas.</span>
              </div>
            ) : (
              <div className="lp-schedules">
                {items.map((schedule) => {
                  const date = new Date(schedule.starts_at);
                  return (
                    <article className="lp-schedule" key={schedule.id}>
                      <div className="lp-schedule-date">
                        <strong>{dayNumber.format(date)}</strong>
                        <span>{monthShort.format(date)}</span>
                      </div>
                      <div className="lp-schedule-body">
                        <span className={`status ${schedule.status.toLowerCase()}`}>{schedule.status}</span>
                        <h3>{schedule.posyandu_name}</h3>
                        <p><ClockIcon />{fullDate.format(date)} · {timeOnly.format(date)} WIB</p>
                        <p><PinIcon />{schedule.location}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Alur */}
        <section className="lp-section" id="alur">
          <div className="lp-container">
            <div className="lp-section-head">
              <span className="lp-kicker">Alur Kegiatan</span>
              <h2>Lima langkah pelayanan dalam Posyandu</h2>
              <p>Setiap warga dilayani secara berurutan agar pemeriksaan berjalan tertib dan tercatat dengan baik</p>
            </div>
            <ol className="lp-steps">
              {steps.map((step, index) => (
                <li key={step.title}>
                  <span className="lp-step-num">{String(index + 1).padStart(2, '0')}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Petugas */}
        <section className="lp-section" id="petugas">
          <div className="lp-container">
            <div className="lp-officer">
              <div className="lp-officer-copy">
                <span className="lp-kicker lp-kicker-light">Untuk Bidan & Kader</span>
                <h2>Pencatatan Posyandu kini lebih cepat dan rapi</h2>
                <p>Sistem pelayanan publik untuk pendataan kesehatan masyarakat yang lebih terstruktur bagi petugas kesehatan</p>
                <div className="lp-privacy lp-privacy-inline">
                  <span className="lp-privacy-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.5-3 8.4-7 10-4-1.6-7-5.5-7-10V6l7-3Z" /><path d="M9 12l2 2 4-4" /></svg>
                  </span>
                  <div>
                    <h3>Privasi warga adalah prioritas</h3>
                    <p>Melayani dengan hati, melindungi dengan aksi, privasi warga adalah prioritas utama</p>
                  </div>
                </div>
              </div>
              <div className="lp-officer-grid">
                {officerFeatures.map((feature) => (
                  <div className="lp-officer-item" key={feature.title}>
                    <span className="lp-check" aria-hidden="true">
                      <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                    </span>
                    <div><h3>{feature.title}</h3><p>{feature.text}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div>
            <div className="brand lp-brand">
              <PosyanduLogo id="footer" />
              <div><strong>Monitoring Posyandu</strong><span>Desa Sindangsari</span></div>
            </div>
            <p>Sistem informasi dan monitoring kegiatan Posyandu Desa Sindangsari</p>
          </div>
          <div className="lp-footer-links">
            <div>
              <h4>Masyarakat</h4>
              <a href="#layanan">Layanan</a>
              <a href="#jadwal">Jadwal kegiatan</a>
              <a href="#alur">Alur kegiatan</a>
            </div>
          </div>
        </div>
        <div className="lp-container lp-footer-bottom">
          <span>Dikembangkan oleh Kelompok 3 • Mahasiswa Teknik Informatika Institut Teknologi Sumatera</span>
        </div>
      </footer>
    </div>
  );
}
