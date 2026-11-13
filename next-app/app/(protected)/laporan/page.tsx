import { requireActiveProfile } from '@/lib/auth';
import Link from 'next/link';
import { loadReportAvailability, loadReportRows, normalizeReportFilters } from '@/lib/reports';
import { PageHero } from '@/components/page-hero';
import { ReportFiltersForm } from '@/components/report-filters';

type Props = { searchParams: Promise<{ category?: string; period?: string; posyandu?: string; start?: string; end?: string; page?: string }> };
type Posyandu = { id: string; name: string };

const PAGE_SIZE = 10;

function SvgIcon({ children, size = 16 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function getCategoryBadge(category: string) {
  const catLower = category.toLowerCase();
  if (catLower.includes('balita') || catLower.includes('anak')) {
    return {
      label: 'Balita & Anak',
      badgeClass: 'report-cat-balita',
      icon: (
        <SvgIcon size={14}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9 12h.01M15 12h.01" />
          <path d="M10 16c.5.5 1.2.8 2 .8s1.5-.3 2-.8" />
        </SvgIcon>
      ),
    };
  }
  if (catLower.includes('hamil') || catLower.includes('anc')) {
    return {
      label: 'Ibu Hamil (ANC)',
      badgeClass: 'report-cat-ibu',
      icon: (
        <SvgIcon size={14}>
          <circle cx="12" cy="5" r="2.5" />
          <path d="M10 10h4c1.1 0 2 .9 2 2v2c0 2.2-1.8 4-4 4h-1v4" />
        </SvgIcon>
      ),
    };
  }
  return {
    label: 'Lansia & PTM',
    badgeClass: 'report-cat-lansia',
    icon: (
      <SvgIcon size={14}>
        <circle cx="10" cy="4" r="2" />
        <path d="M10 7v5l-3 4" />
        <path d="M10 12l3 9" />
      </SvgIcon>
    ),
  };
}

export default async function ReportsPage({ searchParams }: Props) {
  const params = await searchParams;
  const { profile, supabase } = await requireActiveProfile();
  const filters = normalizeReportFilters(params);
  
  const [{ data: posyanduData }, report] = await Promise.all([
    supabase.from('posyandu').select('id, name').eq('is_active', true).order('name'),
    loadReportRows(supabase, filters),
  ]);
  
  const posyandu = (posyanduData ?? []) as Posyandu[];
  const availability = !report.error && report.rows.length === 0 ? await loadReportAvailability(supabase, filters) : null;
  
  const exportQuery = new URLSearchParams({ category: filters.category, period: filters.period, start: filters.startDate, end: filters.endDate });
  if (filters.posyanduId) exportQuery.set('posyandu', filters.posyanduId);
  
  const availableQuery = new URLSearchParams(exportQuery);
  if (availability?.startDate && availability.endDate) {
    availableQuery.set('period', 'custom');
    availableQuery.set('start', availability.startDate);
    availableQuery.set('end', availability.endDate);
  }
  
  const formatDate = (date: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date(`${date}T00:00:00+07:00`));
  const formatMonthYear = (date: string) => new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date(`${date}T00:00:00+07:00`));

  const total = report.rows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1));
  const from = (page - 1) * PAGE_SIZE;
  const paginatedRows = report.rows.slice(from, from + PAGE_SIZE);

  const buildPageHref = (targetPage: number) => {
    const sp = new URLSearchParams(exportQuery);
    if (targetPage > 1) sp.set('page', String(targetPage));
    const qs = sp.toString();
    return qs ? `/laporan?${qs}` : '/laporan';
  };

  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => Math.max(1, Math.min(page - 2, totalPages - 4)) + index);

  return (
    <div className="stitch-dashboard">
      <PageHero
        profile={profile}
        pageTitle="Laporan & Rekapitulasi"
        pageDescription="Rekapitulasi data pemeriksaan, kehadiran, dan statistik kesehatan posyandu per kategori dan rentang waktu."
      />

      <main className="stitch-content laporan-content report-page">
        <section className="card">
          <ReportFiltersForm
            key={`${filters.category}:${filters.posyanduId}:${filters.period}:${filters.startDate}:${filters.endDate}`}
            filters={filters}
            posyandu={posyandu}
          />
          <p className="muted-copy">
            Rentang dihitung mundur dari tanggal akhir, termasuk tanggal tersebut. Periode mengikuti tanggal pengukuran atau pemeriksaan. Setelah mengubah filter, klik Tampilkan sebelum mengunduh.
          </p>
        </section>

        {report.error && <div className="form-error" role="alert">{report.error}</div>}
        {availability?.error && <div className="form-error" role="alert">{availability.error}</div>}

        {/* Rekap Table Card matching reference image */}
        <section className="stitch-report-card">
          <div className="stitch-report-header">
            <div className="stitch-report-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
            </div>
            <div className="stitch-report-title">
              <h2>Data Rekap Laporan Bulanan</h2>
              <p>Hasil kompilasi register KMS, form ANC, dan skrining PTM</p>
            </div>
          </div>

          {report.rows.length === 0 ? (
            <div className="empty" style={{ margin: 24 }}>
              {report.error || availability?.error ? (
                <p>Laporan belum dapat ditampilkan. Periksa pesan kesalahan di atas.</p>
              ) : availability && availability.count > 0 && availability.startDate && availability.endDate ? (
                <div>
                  <p>Tidak ada catatan pada periode {formatDate(filters.startDate)} sampai {formatDate(filters.endDate)}.</p>
                  <p>Ada {availability.count} catatan pada kategori dan Posyandu yang dipilih, dengan tanggal pemeriksaan {formatDate(availability.startDate)} sampai {formatDate(availability.endDate)}.</p>
                  <Link className="ghost-btn" href={`/laporan?${availableQuery}`}>Tampilkan periode seluruh riwayat</Link>
                </div>
              ) : (
                <div>
                  <p>Belum ada riwayat pengukuran atau pemeriksaan yang dapat diakses pada kategori dan Posyandu ini.</p>
                  <p>Periksa kategori dan Posyandu, serta pastikan catatan sudah muncul di riwayat warga setelah disimpan.</p>
                </div>
              )}
              <p>Unduhan tersedia setelah hasil laporan berisi data.</p>
            </div>
          ) : (
            <div className="lansia-table-wrap">
              <table className="stitch-report-table">
                <thead>
                  <tr>
                    <th style={{ width: 48, textAlign: 'center' }}>NO</th>
                    <th>PERIODE / TANGGAL</th>
                    <th>KATEGORI &amp; MODUL</th>
                    <th>POSYANDU &amp; SASARAN</th>
                    <th>TOTAL PESERTA TERLAYANI</th>
                    <th>STATUS REKAPITULASI</th>
                    <th style={{ textAlign: 'center', width: 220 }}>AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((row, index) => {
                    const catBadge = getCategoryBadge(row.category);
                    return (
                      <tr key={`${row.category}:${row.id}`}>
                        <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                          {from + index + 1}
                        </td>
                        <td>
                          <div className="report-date-cell">
                            <strong>{formatDate(row.date)}</strong>
                            <span>Periode {formatMonthYear(row.date)}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`report-cat-badge ${catBadge.badgeClass}`}>
                            {catBadge.icon}
                            {catBadge.label}
                          </span>
                        </td>
                        <td>
                          <div className="report-posyandu-cell">
                            <strong>{row.posyandu}</strong>
                            <span>{row.name}</span>
                          </div>
                        </td>
                        <td>
                          <div className="report-detail-cell">
                            <strong>{row.result}</strong>
                            <span>{row.notes && row.notes !== '-' ? row.notes : 'Pencatatan pemeriksaan terverifikasi'}</span>
                          </div>
                        </td>
                        <td>
                          <span className="report-status-verified">
                            <SvgIcon size={13}>
                              <polyline points="20 6 9 17 4 12" />
                            </SvgIcon>
                            Lengkap &amp; Terverifikasi
                          </span>
                        </td>
                        <td>
                          <div className="stitch-export-actions" style={{ justifyContent: 'center' }}>
                            <a
                              className="stitch-btn-export-csv"
                              href={`/api/laporan/excel?${exportQuery}`}
                              title={`Unduh Excel - ${row.name}`}
                            >
                              <SvgIcon size={14}>
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <path d="M3 9h18" />
                                <path d="M9 21V9" />
                              </SvgIcon>
                              Unduh Excel
                            </a>
                            <a
                              className="stitch-btn-export-pdf"
                              href={`/api/laporan/pdf?${exportQuery}`}
                              title={`Unduh PDF - ${row.name}`}
                            >
                              <SvgIcon size={14}>
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                              </SvgIcon>
                              Unduh PDF
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer */}
          <div className="schedule-footer">
            <p>
              Menampilkan <strong>{total ? from + 1 : 0}–{from + paginatedRows.length}</strong> dari <strong>{total}</strong> catatan
            </p>
            <nav className="pagination" aria-label="Halaman">
              {page > 1 ? (
                <Link className="ghost-btn" href={buildPageHref(page - 1)}>
                  Sebelumnya
                </Link>
              ) : (
                <span className="ghost-btn disabled">Sebelumnya</span>
              )}
              {pageNumbers.map((number) => (
                <Link
                  key={number}
                  className={`page-number${number === page ? ' active' : ''}`}
                  href={buildPageHref(number)}
                  aria-current={number === page ? 'page' : undefined}
                >
                  {number}
                </Link>
              ))}
              {page < totalPages ? (
                <Link className="ghost-btn" href={buildPageHref(page + 1)}>
                  Selanjutnya
                </Link>
              ) : (
                <span className="ghost-btn disabled">Selanjutnya</span>
              )}
            </nav>
          </div>
        </section>
      </main>
    </div>
  );
}
