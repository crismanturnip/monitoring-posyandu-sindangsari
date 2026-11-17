import Link from 'next/link';
import { createPregnantMother, updatePregnantMother, softDeletePregnantMother } from './actions';
import { requireActiveProfile } from '@/lib/auth';
import { PageHero } from '@/components/page-hero';
import { Modal } from '@/components/modal';
import { jakartaDate } from '@/lib/health-record-dates';
import { reportAge } from '@/lib/report-age';

type Props = {
  searchParams: Promise<{
    q?: string;
    posyandu?: string;
    kategori?: string;
    page?: string;
    tambah?: string;
    edit?: string;
    hapus?: string;
  }>;
};

type Mother = {
  id: string;
  name: string;
  nik: string | null;
  birth_date: string | null;
  husband_name: string | null;
  husband_nik: string | null;
  phone_number: string | null;
  gestational_age_weeks: number | null;
  posyandu_id: string;
  posyandu: { name: string } | null;
  created_at?: string;
  pregnancy_visits?: { id: string; visited_at: string; officer_notes: string | null; created_at: string }[];
};

type Posyandu = { id: string; name: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 10;

function Svg({ children, size = 16 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const SearchIcon = () => <Svg><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>;
const PlusIcon = () => <Svg><path d="M12 5v14M5 12h14" /></Svg>;
const ResetIcon = () => <Svg><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></Svg>;
const EditIcon = () => <Svg><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></Svg>;
const TrashIcon = ({ size }: { size?: number }) => <Svg size={size}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m19 6-1 14H6L5 6" /></Svg>;
const CloseIcon = () => <Svg size={18}><path d="M18 6 6 18M6 6l12 12" /></Svg>;


export default async function PregnantMothersPage({ searchParams }: Props) {
  const params = await searchParams;
  const { profile, supabase } = await requireActiveProfile();
  const canManage = profile.role === 'BIDAN';

  const q = (params.q ?? '').replace(/[,()%*\\]/g, ' ').trim().slice(0, 80);
  const posyanduFilter = uuidPattern.test(params.posyandu ?? '') ? String(params.posyandu) : '';
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from('pregnant_mothers')
    .select('id, name, nik, birth_date, husband_name, husband_nik, phone_number, gestational_age_weeks, posyandu_id, posyandu(name), created_at, pregnancy_visits(id, visited_at, officer_notes, created_at)', { count: 'exact' })
    .is('deleted_at', null)
    .order('visited_at', { referencedTable: 'pregnancy_visits', ascending: false })
    .order('created_at', { referencedTable: 'pregnancy_visits', ascending: false })
    .order('id', { referencedTable: 'pregnancy_visits', ascending: false })
    .limit(1, { referencedTable: 'pregnancy_visits' });

  if (q) {
    query = query.or(`name.ilike.%${q}%,husband_name.ilike.%${q}%`);
  }
  if (posyanduFilter) {
    query = query.eq('posyandu_id', posyanduFilter);
  }

  query = query.order('name').range(from, from + PAGE_SIZE - 1);

  const editId = canManage && uuidPattern.test(params.edit ?? '') ? String(params.edit) : '';
  const deleteId = canManage && uuidPattern.test(params.hapus ?? '') ? String(params.hapus) : '';

  const [{ data: mothersData, count, error: mothersError }, { data: posyanduData }, { data: editData }, { data: deleteData }] = await Promise.all([
    query,
    supabase.from('posyandu').select('id, name').eq('is_active', true).order('name'),
    editId ? supabase.from('pregnant_mothers').select('id, name, nik, birth_date, husband_name, husband_nik, phone_number, gestational_age_weeks, posyandu_id').eq('id', editId).maybeSingle() : Promise.resolve({ data: null }),
    deleteId ? supabase.from('pregnant_mothers').select('id, name, posyandu(name)').eq('id', deleteId).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const rawMothers = (mothersData ?? []) as unknown as Mother[];
  const posyandu = (posyanduData ?? []) as Posyandu[];
  const editing = editData as unknown as Mother | null;
  const deleting = deleteData as unknown as Mother | null;
  const showForm = canManage && (params.tambah === '1' || Boolean(editing));

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (extra: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries({ q, posyandu: posyanduFilter, ...extra })) {
      if (value) search.set(key, value);
    }
    const text = search.toString();
    return text ? `/ibu-hamil?${text}` : '/ibu-hamil';
  };

  const pageParam = page > 1 ? String(page) : undefined;
  const closeHref = buildHref({ page: pageParam });
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => Math.max(1, Math.min(page - 2, totalPages - 4)) + index);

  const mothers = rawMothers;

  return (
    <div className="stitch-dashboard">
      <PageHero profile={profile} pageTitle="Ibu Hamil" />

      <main className="stitch-content ibu-hamil-content">
        {/* Tombol Tambah Data Ibu Hamil */}
        <div className="ibu-hamil-top-actions">
          {canManage && (
            <Link className="ibu-hamil-add-btn" href={buildHref({ tambah: '1', page: pageParam })}>
              <PlusIcon /> Tambah Data Ibu Hamil
            </Link>
          )}
        </div>

        {/* 2 Stat Cards sesuai screenshot */}
        <section className="ibu-hamil-stats-grid" aria-label="Statistik Ibu Hamil">
          {/* Card 1: TOTAL IBU HAMIL */}
          <div className="ibu-hamil-stat-card">
            <div className="stitch-stat-header">
              <span className="stitch-stat-label">TOTAL IBU HAMIL</span>
              <div className="stitch-stat-icon-wrap stat-icon-teal" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="4" r="2.5" />
                  <path d="M10 9h4c1.1 0 2 .9 2 2v2c0 2.2-1.8 4-4 4h-1v5" />
                  <path d="M9 9l-1 7h2" />
                </svg>
              </div>
            </div>
            <div className="stitch-stat-value">{new Intl.NumberFormat('id-ID').format(total)}</div>
            <div className="stitch-stat-footer">
              <span className="stitch-chip">
                <span className="chip-bullet">•</span> {total} Terdaftar
              </span>
              <span className="stitch-chip chip-highlight-teal">Terdata di Register</span>
            </div>
          </div>

          {/* Card 2: PENILAIAN RISIKO */}
          <div className="ibu-hamil-stat-card">
            <div className="stitch-stat-header">
              <span className="stitch-stat-label">PENILAIAN RISIKO</span>
              <div className="stitch-stat-icon-wrap stat-icon-amber-warn" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
            </div>
            <div className="maternal-risk-value">Belum tersedia</div>
            <div className="stitch-stat-footer">
              <span className="stitch-chip">
                <span className="chip-bullet" style={{ color: '#d97706' }}>•</span> Penilaian belum dicatat
              </span>
              <span className="stitch-chip chip-highlight-amber">Menunggu penilaian petugas</span>
            </div>
          </div>
        </section>

        {/* Filter Bar */}
        <form className="card filter-bar" action="/ibu-hamil" method="get">
          <label className="filter-search">
            <SearchIcon />
            <input name="q" defaultValue={q} placeholder="Cari nama ibu hamil atau suami..." aria-label="Cari nama ibu hamil atau suami" />
          </label>
          <select name="posyandu" defaultValue={posyanduFilter} aria-label="Filter Posyandu">
            <option value="">Semua Posyandu</option>
            {posyandu.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <button className="primary-btn" type="submit">Terapkan</button>
          <Link className="ghost-btn" href="/ibu-hamil">
            <ResetIcon /> Reset
          </Link>
        </form>

        {mothersError && <p className="form-error" role="alert">Data ibu hamil gagal dimuat. Coba muat ulang halaman.</p>}

        {/* Tabel Data Ibu Hamil Sesuai Screenshot */}
        <section className="card ibu-hamil-table-card">
          <div className="ibu-hamil-table-wrap horizontal-data-scroll" role="region" aria-label="Tabel ibu hamil, geser untuk melihat kolom lainnya" tabIndex={0}>
            <table className="ibu-hamil-table" aria-label="Daftar ibu hamil">
              <thead>
                <tr>
                  <th style={{ width: 48, textAlign: 'center' }}>NO</th>
                  <th>NAMA IBU HAMIL</th>
                  <th>USIA / USIA KEHAMILAN</th>
                  <th>NAMA SUAMI</th>
                  <th>POSYANDU</th>
                  <th>STATUS KESEHATAN / RISIKO</th>
                  <th>PEMERIKSAAN TERAKHIR</th>
                  {canManage && <th style={{ textAlign: 'center', width: 90 }}>AKSI</th>}
                </tr>
              </thead>
              <tbody>
                {mothers.length === 0 && (
                  <tr>
                    <td colSpan={canManage ? 8 : 7}>
                      <div className="empty">Belum ada data ibu hamil yang cocok dengan pencarian Anda.</div>
                    </td>
                  </tr>
                )}
                {mothers.map((mother, index) => {
                  return (
                    <tr key={mother.id}>
                      <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                        {from + index + 1}
                      </td>
                      <td>
                        <Link className="maternal-name" href={`/ibu-hamil/${mother.id}`}>{mother.name}</Link>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f2f2b', fontSize: 13, marginBottom: 3 }}>
                          {mother.birth_date ? reportAge(mother.birth_date, jakartaDate(), false) : 'Belum dicatat'}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {mother.gestational_age_weeks ? `${mother.gestational_age_weeks} minggu kehamilan` : 'Usia kehamilan belum dicatat'}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: '#0f2f2b', fontSize: 13, fontWeight: 600 }}>
                          {mother.husband_name || 'Belum dicatat'}
                        </div>
                      </td>
                      <td>
                        <span>
                          {mother.posyandu?.name ?? 'Posyandu'}
                        </span>
                      </td>
                      <td>
                        <span>Belum dinilai</span>
                      </td>
                      <td>
                        <div className="exam-vitals">
                          <span className="exam-vitals-primary">
                            {mother.pregnancy_visits?.[0]?.officer_notes || 'Belum ada hasil pemeriksaan'}
                          </span>
                          <div className="exam-vitals-sub">
                            {mother.pregnancy_visits?.[0]?.visited_at ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(new Date(`${mother.pregnancy_visits[0].visited_at}T00:00:00+07:00`)) : 'Belum ada riwayat kunjungan'}
                          </div>
                        </div>
                      </td>
                      {canManage && (
                        <td>
                          <div className="row-icons" style={{ justifyContent: 'center' }}>
                            <Link
                              className="icon-btn"
                              href={buildHref({ edit: mother.id, page: pageParam })}
                              aria-label={`Ubah ${mother.name}`}
                            >
                              <EditIcon />
                            </Link>
                            <Link
                              className="icon-btn icon-btn-danger"
                              href={buildHref({ hapus: mother.id, page: pageParam })}
                              aria-label={`Hapus ${mother.name}`}
                            >
                              <TrashIcon />
                            </Link>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer dengan Paginasi */}
          <div className="schedule-footer">
            <p>
              Menampilkan <strong>{mothers.length}</strong> dari <strong>{total}</strong> data ibu hamil terdaftar
            </p>
            <nav className="pagination" aria-label="Halaman">
              {page > 1 ? (
                <Link className="ghost-btn" href={buildHref({ page: String(page - 1) })}>
                  Sebelumnya
                </Link>
              ) : (
                <span className="ghost-btn disabled">Sebelumnya</span>
              )}
              {pageNumbers.map((number) => (
                <Link
                  key={number}
                  className={`page-number${number === page ? ' active' : ''}`}
                  href={buildHref({ page: String(number) })}
                  aria-current={number === page ? 'page' : undefined}
                >
                  {number}
                </Link>
              ))}
              {page < totalPages ? (
                <Link className="ghost-btn" href={buildHref({ page: String(page + 1) })}>
                  Selanjutnya
                </Link>
              ) : (
                <span className="ghost-btn disabled">Selanjutnya</span>
              )}
            </nav>
          </div>
        </section>
      </main>

      {/* Modal Tambah / Edit Ibu Hamil Baru Sesuai Referensi Gambar */}
      {showForm && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="anc-modal-title">
          <div className="anc-modal">
            {/* Header Modal */}
            <div className="anc-modal-header">
              <div className={`anc-modal-icon ${editing ? 'icon-edit' : ''}`}>
                {editing ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="4" r="2.5" />
                    <path d="M10 9h4c1.1 0 2 .9 2 2v2c0 2.2-1.8 4-4 4h-1v5" />
                    <path d="M9 9l-1 7h2" />
                  </svg>
                )}
              </div>
              <div className="anc-modal-heading">
                <div className="anc-modal-heading-row">
                  <h2 id="anc-modal-title">
                    {editing ? 'Edit Data Ibu Hamil' : 'Tambah Data Ibu Hamil Baru'}
                  </h2>
                  <span className={`anc-badge ${editing ? 'anc-badge-pill' : 'anc-badge-teal'}`}>
                    {editing ? 'ANC REGISTRY • UPDATE' : 'ANC REGISTRY'}
                  </span>
                </div>
                <p>
                  {editing
                    ? 'Perbarui data pemeriksaan antenatal dan informasi ibu hamil Desa Sindang Sari'
                    : 'Pencatatan data antenatal care dan deteksi faktor risiko Posyandu Desa Sindang Sari'}
                </p>
              </div>
              <Link className="anc-modal-close" href={closeHref} aria-label="Tutup form">
                <CloseIcon />
              </Link>
            </div>

            {/* Form Modal Sesuai Layout Referensi */}
            <form action={editing ? updatePregnantMother : createPregnantMother} className="anc-modal-form">
              {editing && <input type="hidden" name="id" value={editing.id} />}

              {/* Bagian 1: Identitas Ibu & Informasi Domisili */}
              <div className="anc-section-card">
                <div className="anc-section-head">
                  <div className="anc-section-title">
                    {editing ? (
                      <span className="anc-bar-num" />
                    ) : (
                      <span className="anc-step-num">1</span>
                    )}
                    <h3>
                      {editing
                        ? 'Bagian 1: Identitas Ibu & Informasi Domisili'
                        : 'Informasi Identitas Ibu & Domisili'}
                    </h3>
                  </div>
                  <span className="anc-section-hint">
                    {editing ? 'Kerahasiaan data terlindungi' : 'Isi data sesuai dokumen dan hasil pemeriksaan'}
                  </span>
                </div>

                <div className="anc-grid-2">
                  <div className="anc-field">
                    <label className="anc-label">
                      <span>Nama Lengkap Ibu Hamil <span className="req">*</span></span>
                    </label>
                    <div className="anc-input-group">
                      <span className="anc-input-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a8.38 8.38 0 0 1 13 0"/></svg>
                      </span>
                      <input
                        name="name"
                        required
                        defaultValue={editing?.name ?? ''}
                        placeholder="cth. Ny. Siti Rahmawati"
                        className="anc-input"
                      />
                    </div>
                  </div>

                  <div className="anc-field">
                    <label className="anc-label">
                      <span>Tanggal Lahir Ibu</span>
                    </label>
                    <div className="anc-input-group">
                      <span className="anc-input-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      </span>
                      <input
                        type="date"
                        name="birthDate"
                        defaultValue={editing?.birth_date ?? ''}
                        className="anc-input"
                      />
                    </div>
                  </div>

                  <div className="anc-field">
                    <label className="anc-label">NIK Ibu</label>
                    <input name="nik" inputMode="numeric" pattern="[0-9]{16}" maxLength={16} defaultValue={editing?.nik ?? ''} placeholder="16 digit NIK" className="anc-input no-icon" />
                  </div>

                  <div className="anc-field">
                    <label className="anc-label">
                      <span>Nama Suami / Penanggung Jawab</span>
                    </label>
                    <div className="anc-input-group">
                      <span className="anc-input-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      </span>
                      <input
                        name="husbandName"
                        defaultValue={editing?.husband_name ?? ''}
                        placeholder="cth. Tn. Hendra Gunawan"
                        className="anc-input"
                      />
                    </div>
                  </div>

                  <div className="anc-field">
                    <label className="anc-label">NIK Suami</label>
                    <input name="husbandNik" inputMode="numeric" pattern="[0-9]{16}" maxLength={16} defaultValue={editing?.husband_nik ?? ''} placeholder="16 digit NIK" className="anc-input no-icon" />
                  </div>

                  <div className="anc-field">
                    <label className="anc-label">
                      <span>Nomor HP / WhatsApp Aktif</span>
                    </label>
                    <div className="anc-input-group">
                      <span className="anc-input-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      </span>
                      <input
                        name="phoneNumber"
                        defaultValue={editing?.phone_number ?? ''}
                        placeholder="08xxxxxxxxxx"
                        className="anc-input"
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* Bagian 2: Pemeriksaan Antenatal & Karakteristik Klinis */}
              <div className="anc-section-card" style={{ borderTop: '1px dashed #d9e6e0', paddingTop: 16 }}>
                <div className="anc-section-head">
                  <div className="anc-section-title">
                    {editing ? (
                      <span className="anc-bar-num" />
                    ) : (
                      <span className="anc-step-num">2</span>
                    )}
                    <h3>
                      {editing
                        ? 'Bagian 2: Pemeriksaan Antenatal & Karakteristik Klinis'
                        : 'Pemeriksaan Antenatal & Karakteristik Klinis'}
                    </h3>
                  </div>
                  <span className="anc-badge anc-badge-blue">
                    {editing ? 'Standard Buku KIA Kemenkes RI' : 'Buku KIA / Kohort'}
                  </span>
                </div>

                <div className="anc-grid-2">
                  <div className="anc-field">
                    <label className="anc-label">
                      <span>Posyandu Pembina <span className="req">*</span></span>
                    </label>
                    <div className="anc-input-group">
                      <span className="anc-input-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                      </span>
                      <select
                        name="posyanduId"
                        required
                        defaultValue={editing?.posyandu_id ?? ''}
                        className="anc-select"
                      >
                        <option value="" disabled>Pilih Posyandu Pembina</option>
                        {posyandu.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>


                  <div className="anc-field">
                    <label className="anc-label">Usia kehamilan (minggu)</label>
                    <input name="gestationalWeeks" type="number" step="0.1" min="0.1" defaultValue={editing?.gestational_age_weeks ?? ''} className="anc-input no-icon" />
                  </div>


                  <div className="anc-field full">
                    <label className="anc-label" htmlFor="mother-visit-date">Tanggal pemeriksaan baru</label>
                    <input id="mother-visit-date" name="visitedAt" type="date" defaultValue={jakartaDate()} className="anc-input no-icon" />
                    <p className="muted-copy">Isi hasil pemeriksaan di bawah untuk menambah riwayat dan laporan pada tanggal ini. Kosongkan hasil jika hanya menyimpan identitas.</p>
                  </div>
                  <div className="anc-field">
                    <label className="anc-label">
                      <span>Berat dan tinggi badan saat pemeriksaan</span>
                      <span className="hint">Antropometri</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div className="anc-input-group">
                        <input name="weight" className="anc-input no-icon" placeholder="BB" inputMode="decimal" />
                        <span className="anc-input-append">kg</span>
                      </div>
                      <div className="anc-input-group">
                        <input name="height" className="anc-input no-icon" placeholder="TB" inputMode="decimal" />
                        <span className="anc-input-append">cm</span>
                      </div>
                    </div>
                  </div>

                    <div className="anc-field">
                      <label className="anc-label">
                        <span>Tekanan Darah (TD)</span>
                      </label>
                      <div className="anc-input-group">
                        <span className="anc-input-icon">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                        </span>
                        <input name="bloodPressure" placeholder="Contoh: 110/70" className="anc-input" />
                        <span className="anc-input-append">mmHg</span>
                      </div>
                    </div>

                  <div className="anc-field full">
                    <label className="anc-label">
                      <span>Lingkar Lengan Atas (LiLA) dalam cm</span>
                      <span className="hint">ⓘ Batas Normal Kemenkes: ≥ 23.5 cm</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: editing ? '160px 1fr' : '180px 1fr', gap: 14, alignItems: 'center' }}>
                      <div className="anc-input-group">
                        <span className="anc-input-icon">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                        </span>
                        <input name="lila" inputMode="decimal" placeholder="Contoh: 24,0" className="anc-input" />
                        <span className="anc-input-append">cm</span>
                      </div>

                      <p className="muted-copy">Hasil penilaian gizi dicatat oleh petugas berdasarkan pemeriksaan.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Modal */}
              <div className="anc-modal-footer">
                <div className="anc-officer-meta">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  <span>
                    {editing
                      ? `Tercatat oleh: ${profile.full_name} (${profile.role === 'BIDAN' ? 'Bidan Desa' : 'Kader Posyandu'})`
                      : `Bidan Desa: ${profile.full_name}`}
                  </span>
                </div>

                <div className="anc-footer-actions">
                  <Link className="anc-btn-cancel" href={closeHref}>
                    Batal
                  </Link>
                  <button className="anc-btn-submit" type="submit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    {editing ? 'Simpan Perubahan' : 'Simpan Data Ibu Hamil'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hapus Ibu Hamil */}
      {!showForm && deleting && (
        <Modal closeHref={closeHref} labelledBy="delete-modal-title" tone="danger">
          <div className="modal-head">
            <div className="modal-icon danger">
              <TrashIcon size={22} />
            </div>
            <div className="modal-titles">
              <p className="modal-eyebrow danger">Konfirmasi Penghapusan</p>
              <h2 id="delete-modal-title">Hapus Data Ibu Hamil?</h2>
            </div>
            <Link className="modal-close" href={closeHref} aria-label="Tutup">
              <CloseIcon />
            </Link>
          </div>
          <div className="modal-body">
            <p>
              Apakah Anda yakin ingin menghapus data ibu hamil <strong>{deleting.name}</strong>? Data riwayat kunjungan yang terkait tidak akan tampil lagi di daftar utama.
            </p>
            <form action={softDeletePregnantMother} className="delete-actions">
              <input type="hidden" name="id" value={deleting.id} />
              <Link className="ghost-btn" href={closeHref}>
                Batal
              </Link>
              <button className="danger-btn" type="submit">
                <TrashIcon /> Ya, Hapus Data
              </button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
