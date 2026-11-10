import Link from 'next/link';
import { requireActiveProfile } from '@/lib/auth';
import { LogoutButton } from '@/components/logout-button';
import { RefreshButton } from '@/components/refresh-button';

type Schedule = {
  id: string;
  starts_at: string;
  location: string;
  posyandu: { name: string } | null;
};

type Activity = {
  id: string;
  action: string;
  object_type: string;
  created_at: string;
};

const activityLabels: Record<string, string> = {
  children: 'data bayi/balita',
  child_measurements: 'pengukuran bayi/balita',
  pregnant_mothers: 'data ibu hamil',
  pregnancy_visits: 'kunjungan ibu hamil',
  elderly_people: 'data lansia',
  elderly_examinations: 'pemeriksaan lansia',
  schedules: 'jadwal kegiatan',
  posyandu: 'data posyandu',
  kader_assignments: 'penugasan kader',
};

const activityDescriptions: Record<string, string> = {
  children: 'Pencatatan antropometri & biodata balita',
  child_measurements: 'Pengukuran berat & tinggi badan balita',
  pregnant_mothers: 'Pencatatan data ibu hamil wilayah binaan',
  pregnancy_visits: 'Skrining ANC dan pemeriksaan berkala',
  elderly_people: 'Pencatatan data lansia dan rekam kesehatan',
  elderly_examinations: 'Skrining tekanan darah dan gula darah',
  schedules: 'Jadwal pelayanan posyandu penimbangan',
  posyandu: 'Pembaruan informasi posyandu wilayah',
  kader_assignments: 'Verifikasi dan penugasan kader',
};

function formatRelativeTime(dateInput: string): string {
  const date = new Date(dateInput);
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 60) return 'Baru saja';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} jam lalu`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Kemarin';
  if (diffInDays < 7) return `${diffInDays} hari lalu`;
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(date);
}

function formatScheduleDate(dateInput: string): { dayMonth: string; time: string } {
  const date = new Date(dateInput);
  const dayMonth = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' }).format(date);
  const time = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(date);
  return { dayMonth, time: `${time} WIB` };
}

export default async function DashboardPage() {
  const { profile, supabase } = await requireActiveProfile();
  const now = new Date().toISOString();

  const [children, mothers, elderly, posyandu, schedules, activities] = await Promise.all([
    supabase.from('children').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('pregnant_mothers').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('elderly_people').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('posyandu').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase
      .from('schedules')
      .select('id, starts_at, location, posyandu(name)')
      .gte('starts_at', now)
      .neq('status', 'DIBATALKAN')
      .order('starts_at')
      .limit(5),
    profile.role === 'BIDAN'
      ? supabase
          .from('activity_logs')
          .select('id, action, object_type, created_at')
          .order('created_at', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] as Activity[] }),
  ]);

  const childCount = children.count ?? 0;
  const motherCount = mothers.count ?? 0;
  const elderlyCount = elderly.count ?? 0;
  const posyanduCount = posyandu.count ?? 0;
  const upcoming = (schedules.data ?? []) as unknown as Schedule[];
  const activityData = (activities.data ?? []) as Activity[];

  const todayFormatted = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date());

  const userInitial = profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="stitch-dashboard">
      {/* Top Teal Hero Banner with Botanical Leaf Accents */}
      <header className="stitch-hero">
        <div className="stitch-hero-ambient" aria-hidden="true" />
        
        {/* Organic Leaf Impressions Backdrop */}
        <div className="stitch-hero-leaf-backdrop" aria-hidden="true">
          <svg viewBox="0 0 600 360" fill="none" xmlns="http://www.w3.org/2000/svg" className="stitch-leaf-svg" preserveAspectRatio="xMidYMid slice">
            {/* Soft dark organic silhouette shape */}
            <path d="M260 90 C410 40, 540 120, 500 260 C470 330, 340 330, 240 290 C170 260, 190 140, 260 90 Z" fill="rgba(0, 35, 30, 0.08)" />
            
            {/* Primary botanical leaf with veins */}
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

            {/* Secondary floating leaf */}
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

            {/* Graceful curved stem vine */}
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
                <small>{profile.role === 'BIDAN' ? 'Bidan Desa' : 'Kader'}</small>
              </div>
              <LogoutButton className="stitch-logout-btn" />
            </div>
          </div>
        </div>

        {/* Greeting Banner - Mascot removed & typography neatly refined */}
        <div className="stitch-hero-greeting">
          <div className="stitch-greeting-content">
            <span className="stitch-greeting-prefix">Selamat Datang,</span>
            <h1 className="stitch-greeting-name">
              {profile.full_name}! <span className="stitch-wave-icon">👋</span>
            </h1>
            <p className="stitch-greeting-desc">
              Ringkasan operasional dan monitoring kesehatan ibu, anak, dan lansia hari ini.
            </p>
          </div>
        </div>
      </header>

      {/* Main Body Content */}
      <main className="stitch-content">
        {/* Realtime Live Status Notice */}
        <div className="stitch-notice-card">
          <div className="stitch-notice-left">
            <div className="stitch-notice-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div className="stitch-notice-text">
              <div className="stitch-notice-title-row">
                <strong>Data langsung dari sistem</strong>
                <span className="stitch-live-pill">
                  <span className="stitch-live-dot" /> LIVE SINDANGSARI
                </span>
              </div>
              <p>Statistik dan jadwal mengikuti hak akses Posyandu akun yang sedang masuk</p>
            </div>
          </div>
          <div className="stitch-notice-right">
            <RefreshButton />
          </div>
        </div>

        {/* 4 Stat Cards */}
        <section className="stitch-stats-grid" aria-label="Statistik Utama">
          {/* Card 1: Bayi & Balita */}
          <Link href="/balita" className="stitch-stat-card">
            <div className="stitch-stat-header">
              <span className="stitch-stat-label">BAYI &amp; BALITA</span>
              <div className="stitch-stat-icon-wrap stat-icon-teal" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12h.01M15 12h.01" />
                  <path d="M10 16c.5.5 1.2.8 2 .8s1.5-.3 2-.8" />
                  <circle cx="12" cy="12" r="9" />
                  <path d="M9 3.5c0 1.5 1.3 2.5 3 2.5s3-1 3-2.5" />
                </svg>
              </div>
            </div>
            <div className="stitch-stat-value">{new Intl.NumberFormat('id-ID').format(childCount)}</div>
            <div className="stitch-stat-footer">
              <span className="stitch-chip">
                <span className="chip-bullet">•</span> {childCount} Terdaftar
              </span>
              <span className="stitch-chip chip-highlight-teal">KMS Aktif</span>
            </div>
          </Link>

          {/* Card 2: Ibu Hamil */}
          <Link href="/ibu-hamil" className="stitch-stat-card">
            <div className="stitch-stat-header">
              <span className="stitch-stat-label">IBU HAMIL</span>
              <div className="stitch-stat-icon-wrap stat-icon-amber" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="4" r="2.5" />
                  <path d="M10 9h4c1.1 0 2 .9 2 2v2c0 2.2-1.8 4-4 4h-1v5" />
                  <path d="M9 9l-1 7h2" />
                </svg>
              </div>
            </div>
            <div className="stitch-stat-value">{new Intl.NumberFormat('id-ID').format(motherCount)}</div>
            <div className="stitch-stat-footer">
              <span className="stitch-chip">
                <span className="chip-bullet">•</span> {motherCount} Terbina
              </span>
              <span className="stitch-chip chip-highlight-amber">Skrining ANC</span>
            </div>
          </Link>

          {/* Card 3: Lansia */}
          <Link href="/lansia" className="stitch-stat-card">
            <div className="stitch-stat-header">
              <span className="stitch-stat-label">LANSIA</span>
              <div className="stitch-stat-icon-wrap stat-icon-blue" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="10" cy="4" r="2" />
                  <path d="M10 7v5l-3 4" />
                  <path d="M10 12l3 9" />
                  <path d="M14 10l2 2v9" />
                  <path d="M7 10h5" />
                </svg>
              </div>
            </div>
            <div className="stitch-stat-value">{new Intl.NumberFormat('id-ID').format(elderlyCount)}</div>
            <div className="stitch-stat-footer">
              <span className="stitch-chip">
                <span className="chip-bullet">•</span> {elderlyCount} Lansia
              </span>
              <span className="stitch-chip chip-highlight-blue">Pos Lansia</span>
            </div>
          </Link>

          {/* Card 4: Posyandu Aktif */}
          <Link href={profile.role === 'BIDAN' ? '/admin/posyandu' : '/jadwal'} className="stitch-stat-card">
            <div className="stitch-stat-header">
              <span className="stitch-stat-label">POSYANDU AKTIF</span>
              <div className="stitch-stat-icon-wrap stat-icon-emerald" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18" />
                  <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
                  <path d="M9 10h6" />
                  <path d="M12 7v6" />
                </svg>
              </div>
            </div>
            <div className="stitch-stat-value">{new Intl.NumberFormat('id-ID').format(posyanduCount)}</div>
            <div className="stitch-stat-footer">
              <span className="stitch-chip">
                <span className="chip-bullet">•</span> Wilayah Binaan
              </span>
              <span className="stitch-chip chip-highlight-emerald">Sindangsari</span>
            </div>
          </Link>
        </section>

        {/* Section Grid: Schedules & Activities */}
        <div className="stitch-section-grid">
          {/* Left Column: Upcoming Schedules */}
          <section className="stitch-card">
            <div className="stitch-card-header">
              <div className="stitch-card-title-group">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="title-icon">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <h2>Jadwal kegiatan mendatang</h2>
              </div>
              <span className="stitch-tag-posyandu">Posyandu</span>
            </div>

            <div className="stitch-card-body">
              {upcoming.length === 0 ? (
                <div className="stitch-empty-state">
                  <div className="stitch-empty-icon" aria-hidden="true">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 20A7 7 0 0 1 4 13C4 8.5 7 4 12 3c1.5 3 2 6.5 1 9.5" />
                      <path d="M12 12.5C14.5 10 17.5 9 20 9c0 5-3.5 8-8 8.5" />
                      <path d="M8 17c1.5 1.5 3.5 2 6 2" />
                    </svg>
                  </div>
                  <strong>Belum ada jadwal mendatang</strong>
                  <p>Jadwal pemeriksaan penimbangan dan posyandu berikutnya akan muncul di sini.</p>
                </div>
              ) : (
                <div className="stitch-schedule-list">
                  {upcoming.map((schedule) => {
                    const { dayMonth, time } = formatScheduleDate(schedule.starts_at);
                    return (
                      <div className="stitch-schedule-item" key={schedule.id}>
                        <div className="schedule-date-chip">
                          <strong>{dayMonth}</strong>
                          <small>{time}</small>
                        </div>
                        <div className="schedule-info">
                          <strong>{schedule.posyandu?.name ?? 'Posyandu'}</strong>
                          <span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            {schedule.location}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="stitch-card-footer">
              <Link href="/jadwal" className="stitch-link-arrow">
                Lihat seluruh jadwal <span></span>
              </Link>
            </div>
          </section>

          {/* Right Column: Recent Activities */}
          <section className="stitch-card">
            <div className="stitch-card-header">
              <div className="stitch-card-title-group">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="title-icon">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <h2>Aktivitas terbaru</h2>
              </div>
              <span className="stitch-header-meta">Terakhir diperbarui</span>
            </div>

            <div className="stitch-card-body">
              {profile.role !== 'BIDAN' ? (
                <div className="stitch-empty-state">
                  <div className="stitch-empty-icon" aria-hidden="true">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <strong>Aktivitas Terbatas</strong>
                  <p>Aktivitas administrasi hanya tersedia untuk bidan penanggung jawab.</p>
                </div>
              ) : activityData.length === 0 ? (
                <div className="stitch-empty-state">
                  <div className="stitch-empty-icon" aria-hidden="true">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <strong>Belum ada aktivitas tercatat</strong>
                  <p>Catatan kegiatan atau perubahan data posyandu akan tercantum di sini.</p>
                </div>
              ) : (
                <div className="stitch-activity-timeline">
                  {activityData.map((activity) => {
                    const actionWord = activity.action === 'insert' ? 'Menambahkan' : activity.action === 'delete' ? 'Menghapus' : 'Memperbarui';
                    const objectName = activityLabels[activity.object_type] ?? activity.object_type;
                    const contextText = activityDescriptions[activity.object_type] ?? 'Pembaruan data operasional Posyandu';
                    const timeAgo = formatRelativeTime(activity.created_at);

                    return (
                      <div className="stitch-activity-item" key={activity.id}>
                        <span className="stitch-activity-dot" aria-hidden="true" />
                        <div className="stitch-activity-content">
                          <div className="activity-main">
                            <strong className="activity-title">
                              {actionWord} {objectName}
                            </strong>
                            <p className="activity-desc">{contextText}</p>
                          </div>
                          <span className="activity-time">{timeAgo}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
