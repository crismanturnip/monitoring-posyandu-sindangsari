import { requireActiveProfile } from '@/lib/auth';
import Link from 'next/link';
import { loadReportAvailability, loadReportRows, normalizeReportFilters } from '@/lib/reports';
import { PageHero } from '@/components/page-hero';
import { ReportFiltersForm } from '@/components/report-filters';
import { reportTablePages, reportCellText } from '@/lib/report-tables';

type Props = { searchParams: Promise<{ category?: string; period?: string; posyandu?: string; start?: string; end?: string; page_bayi?: string; page_balita?: string; 'page_ibu-hamil'?: string; page_lansia?: string }> };
type Posyandu = { id: string; name: string };

const PAGE_SIZE = 10;

function SvgIcon({ children, size = 16 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
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

  const total = report.rows.length;
  const tables = reportTablePages(report.rows, filters, params, PAGE_SIZE);
  const categoryLabel = filters.category === 'semua' ? 'Semua kategori' : tables[0]?.title ?? filters.category;
  const buildPageHref = (pageParam: string, targetPage: number) => {
    const search = new URLSearchParams(exportQuery);
    for (const table of tables) {
      const target = table.pageParam === pageParam ? targetPage : table.page;
      if (target > 1) search.set(table.pageParam, String(target));
    }
    return '/laporan?' + search;
  };

  return (
    <div className="stitch-dashboard">
      <PageHero
        profile={profile}
        pageTitle="Laporan & Rekapitulasi"
        pageDescription="Rekapitulasi data bayi, balita, dan ibu hamil sesuai Posyandu dan periode yang dipilih."
      />

      <main className="stitch-content laporan-content report-page">
        <section className="card">
          <ReportFiltersForm
            key={`${filters.category}:${filters.posyanduId}:${filters.period}:${filters.startDate}:${filters.endDate}`}
            filters={filters}
            posyandu={posyandu}
          />
          <p className="muted-copy">
            Rentang dihitung mundur dari tanggal akhir, termasuk tanggal tersebut. Periode mengikuti tanggal pemeriksaan atau tanggal pendaftaran untuk data yang belum memiliki pemeriksaan pada periode tersebut. Setelah mengubah filter, klik Tampilkan sebelum mengunduh.
          </p>
        </section>

        {report.error && <div className="form-error" role="alert">{report.error}</div>}
        {availability?.error && <div className="form-error" role="alert">{availability.error}</div>}

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
              <h2>Data Rekap Laporan</h2>
              <p>{categoryLabel} · {total} catatan · {formatDate(filters.startDate)} – {formatDate(filters.endDate)}</p>
            </div>
            {total > 0 && (
              <div className="report-downloads">
                <div className="stitch-export-actions">
                  <a className="stitch-btn-export-csv" href={`/api/laporan/excel?${exportQuery}`} aria-describedby="report-download-scope">
                    <SvgIcon size={16}>
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18M9 21V9" />
                    </SvgIcon>
                    Unduh Excel
                  </a>
                  <a className="stitch-btn-export-pdf" href={`/api/laporan/pdf?${exportQuery}`} aria-describedby="report-download-scope">
                    <SvgIcon size={16}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </SvgIcon>
                    Unduh PDF
                  </a>
                </div>
                <p id="report-download-scope">Unduh seluruh {total} catatan sesuai filter, termasuk semua halaman.</p>
              </div>
            )}
          </div>

          {report.rows.length === 0 ? (
            <div className="empty" style={{ margin: 24 }}>
              {report.error || availability?.error ? (
                <p>Laporan belum dapat ditampilkan. Periksa pesan kesalahan di atas.</p>
              ) : availability && availability.count > 0 && availability.startDate && availability.endDate ? (
                <div>
                  <p>Tidak ada catatan pada periode {formatDate(filters.startDate)} sampai {formatDate(filters.endDate)}.</p>
                  <p>Ada {availability.count} catatan pada kategori dan Posyandu yang dipilih, dengan tanggal pencatatan {formatDate(availability.startDate)} sampai {formatDate(availability.endDate)}.</p>
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
            <>
              {tables.map(table => (
                <section className="report-category-table" key={table.title} aria-label={`Laporan ${table.title}`}>
                  <h3>{table.title} · {table.total} catatan</h3>
                  <div className="horizontal-data-scroll report-table-scroll" role="region" aria-label={`Tabel laporan ${table.title}, geser untuk melihat kolom lainnya`} tabIndex={0}>
                    <table className="stitch-report-table report-full-table" aria-label={`Detail laporan ${table.title}`}>
                      <thead>
                        <tr>{table.columns.map(column => <th scope="col" key={column.label}>{column.label}</th>)}</tr>
                      </thead>
                      <tbody>
                        {table.total === 0 && <tr><td colSpan={table.columns.length}>Tidak ada data untuk filter yang dipilih.</td></tr>}
                        {table.rows.map((row, index) => (
                          <tr key={`${row.category}:${row.id}`}>
                            {table.columns.map(column => <td key={column.label}>{reportCellText(column.value(row, table.offset + index))}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="schedule-footer">
                    <p>Menampilkan <strong>{table.total ? table.offset + 1 : 0}–{table.offset + table.rows.length}</strong> dari <strong>{table.total}</strong> catatan {table.title}</p>
                    {table.totalPages > 1 && <nav className="pagination" aria-label={`Halaman ${table.title}`}>
                      {table.page > 1 ? <Link className="ghost-btn" href={buildPageHref(table.pageParam, table.page - 1)}>Sebelumnya</Link> : <span className="ghost-btn disabled">Sebelumnya</span>}
                      {Array.from({ length: Math.min(table.totalPages, 5) }, (_, index) => Math.max(1, Math.min(table.page - 2, table.totalPages - 4)) + index).map(number => (
                        <Link key={number} className={`page-number${number === table.page ? ' active' : ''}`} href={buildPageHref(table.pageParam, number)} aria-current={number === table.page ? 'page' : undefined}>{number}</Link>
                      ))}
                      {table.page < table.totalPages ? <Link className="ghost-btn" href={buildPageHref(table.pageParam, table.page + 1)}>Selanjutnya</Link> : <span className="ghost-btn disabled">Selanjutnya</span>}
                    </nav>}
                  </div>
                </section>
              ))}
            </>
          )}


        </section>
      </main>
    </div>
  );
}
