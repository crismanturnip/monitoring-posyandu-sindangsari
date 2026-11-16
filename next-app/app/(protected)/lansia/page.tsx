import Link from 'next/link';
import { createElderlyPerson, updateElderlyPerson, softDeleteElderlyPerson } from './actions';
import { requireActiveProfile } from '@/lib/auth';
import { PageHero } from '@/components/page-hero';
import { Modal } from '@/components/modal';

type Props = {
  searchParams: Promise<{
    q?: string;
    posyandu?: string;
    page?: string;
    tambah?: string;
    edit?: string;
    hapus?: string;
  }>;
};

type ElderlyPerson = {
  id: string;
  name: string;
  posyandu_id: string;
  posyandu: { name: string } | null;
  created_at?: string;
  elderly_examinations?: { id: string; examined_at: string; officer_notes: string | null; created_at: string }[];
};

type Posyandu = { id: string; name: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 10;

function formatExaminationDate(date: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(new Date(`${date}T00:00:00+07:00`));
}

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

export default async function ElderlyPeoplePage({ searchParams }: Props) {
  const params = await searchParams;
  const { profile, supabase } = await requireActiveProfile();
  const canManage = profile.role === 'BIDAN';

  const q = (params.q ?? '').replace(/[,()%*\\]/g, ' ').trim().slice(0, 80);
  const posyanduFilter = uuidPattern.test(params.posyandu ?? '') ? String(params.posyandu) : '';
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from('elderly_people')
    .select('id, name, posyandu_id, posyandu(name), elderly_examinations(id, examined_at, officer_notes, created_at)', { count: 'exact' })
    .is('deleted_at', null)
    .order('examined_at', { referencedTable: 'elderly_examinations', ascending: false })
    .order('created_at', { referencedTable: 'elderly_examinations', ascending: false })
    .order('id', { referencedTable: 'elderly_examinations', ascending: false })
    .limit(1, { referencedTable: 'elderly_examinations' });

  let examinationCountQuery = supabase
    .from('elderly_examinations')
    .select('id, elderly_people!inner(name, posyandu_id, deleted_at)', { count: 'exact', head: true })
    .is('elderly_people.deleted_at', null);

  if (q) {
    query = query.ilike('name', `%${q}%`);
    examinationCountQuery = examinationCountQuery.ilike('elderly_people.name', `%${q}%`);
  }
  if (posyanduFilter) {
    query = query.eq('posyandu_id', posyanduFilter);
    examinationCountQuery = examinationCountQuery.eq('elderly_people.posyandu_id', posyanduFilter);
  }

  query = query.order('name').range(from, from + PAGE_SIZE - 1);

  const editId = canManage && uuidPattern.test(params.edit ?? '') ? String(params.edit) : '';
  const deleteId = canManage && uuidPattern.test(params.hapus ?? '') ? String(params.hapus) : '';

  const [{ data: elderlyData, count, error: elderlyError }, { data: posyanduData }, { data: editData }, { data: deleteData }, { count: examinationCount, error: examinationCountError }] = await Promise.all([
    query,
    supabase.from('posyandu').select('id, name').eq('is_active', true).order('name'),
    editId ? supabase.from('elderly_people').select('id, name, posyandu_id').eq('id', editId).maybeSingle() : Promise.resolve({ data: null }),
    deleteId ? supabase.from('elderly_people').select('id, name, posyandu(name)').eq('id', deleteId).maybeSingle() : Promise.resolve({ data: null }),
    examinationCountQuery,
  ]);

  const elderlyPeople = (elderlyData ?? []) as unknown as ElderlyPerson[];
  const posyandu = (posyanduData ?? []) as Posyandu[];
  const editing = editData as unknown as ElderlyPerson | null;
  const deleting = deleteData as unknown as ElderlyPerson | null;
  const showForm = canManage && (params.tambah === '1' || Boolean(editing));

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (extra: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries({ q, posyandu: posyanduFilter, ...extra })) {
      if (value) search.set(key, value);
    }
    const text = search.toString();
    return text ? `/lansia?${text}` : '/lansia';
  };

  const pageParam = page > 1 ? String(page) : undefined;
  const closeHref = buildHref({ page: pageParam });
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => Math.max(1, Math.min(page - 2, totalPages - 4)) + index);

  return (
    <div className="stitch-dashboard">
      <PageHero profile={profile} pageTitle="Lansia" />

      <main className="stitch-content lansia-content">
        {/* Top Button Tambah Data Lansia */}
        <div className="lansia-top-actions">
          {canManage && (
            <Link className="lansia-add-btn" href={buildHref({ tambah: '1', page: pageParam })}>
              <PlusIcon /> Tambah Data Lansia
            </Link>
          )}
        </div>

        {/* Ringkasan data tersimpan */}
        <section className="lansia-stats-grid" aria-label="Statistik Lansia">
          {/* Card 1: TOTAL LANSIA */}
          <div className="lansia-stat-card">
            <div className="stitch-stat-header">
              <span className="stitch-stat-label">TOTAL LANSIA</span>
              <div className="stitch-stat-icon-wrap stat-icon-teal" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="10" cy="4" r="2" />
                  <path d="M10 7v5l-3 4" />
                  <path d="M10 12l3 9" />
                  <path d="M14 10l2 2v9" />
                  <path d="M7 10h5" />
                </svg>
              </div>
            </div>
            <div className="stitch-stat-value">{elderlyError ? '-' : new Intl.NumberFormat('id-ID').format(total)}</div>
            <div className="stitch-stat-footer">
              <span className="stitch-chip">
                <span className="chip-bullet">•</span> {total} Terdaftar
              </span>
              <span className="stitch-chip chip-highlight-teal">Terdata di Register Lansia</span>
            </div>
          </div>

          <div className="lansia-stat-card">
            <div className="stitch-stat-header">
              <span className="stitch-stat-label">CATATAN PEMERIKSAAN</span>
              <div className="stitch-stat-icon-wrap stat-icon-teal" aria-hidden="true">
                <Svg size={20}><path d="M9 3h6v4H9z" /><path d="M9 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3M8 12h8M8 16h5" /></Svg>
              </div>
            </div>
            <div className="stitch-stat-value">{examinationCountError ? '-' : new Intl.NumberFormat('id-ID').format(examinationCount ?? 0)}</div>
            <div className="stitch-stat-footer">
              <span className="stitch-chip">Riwayat pemeriksaan tersimpan</span>
            </div>
          </div>
        </section>

        {/* Filter Bar */}
        <form className="card filter-bar" action="/lansia" method="get">
          <label className="filter-search">
            <SearchIcon />
            <input name="q" defaultValue={q} placeholder="Cari nama lansia..." aria-label="Cari nama lansia" />
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
          <Link className="ghost-btn" href="/lansia">
            <ResetIcon /> Reset
          </Link>
        </form>

        {elderlyError && <p className="form-error" role="alert">Data lansia dan pemeriksaan terakhir gagal dimuat. Coba muat ulang halaman.</p>}
        {examinationCountError && <p className="form-error" role="alert">Jumlah catatan pemeriksaan belum dapat dimuat.</p>}

        {/* Daftar lansia */}
        <section className="card lansia-table-card">
          <div className="lansia-table-wrap">
            <table className="lansia-table" aria-label="Daftar lansia">
              <thead>
                <tr>
                  <th style={{ width: 48, textAlign: 'center' }}>NO</th>
                  <th>NAMA LANSIA</th>
                  <th>USIA</th>
                  <th>PENANGGUNG JAWAB</th>
                  <th>POSYANDU</th>
                  <th>STATUS KESEHATAN</th>
                  <th>PEMERIKSAAN TERAKHIR</th>
                  {canManage && <th style={{ textAlign: 'center', width: 90 }}>AKSI</th>}
                </tr>
              </thead>
              <tbody>
                {elderlyPeople.length === 0 && (
                  <tr>
                    <td colSpan={canManage ? 8 : 7}>
                      <div className="empty">{elderlyError ? 'Daftar lansia belum dapat ditampilkan.' : 'Belum ada data lansia yang cocok dengan pencarian Anda.'}</div>
                    </td>
                  </tr>
                )}
                {elderlyPeople.map((person, index) => {
                  const examination = person.elderly_examinations?.[0];
                  return (
                    <tr key={person.id}>
                      <td className="lansia-row-number">{from + index + 1}</td>
                      <td className="lansia-name-column"><Link className="lansia-name-cell" href={`/lansia/${person.id}`}>{person.name}</Link></td>
                      <td className="lansia-empty-value" data-label="Usia">Belum dicatat</td>
                      <td className="lansia-empty-value" data-label="Penanggung jawab">Belum dicatat</td>
                      <td data-label="Posyandu">{person.posyandu?.name ?? 'Belum ditentukan'}</td>
                      <td className="lansia-empty-value" data-label="Status kesehatan">Belum dinilai</td>
                      <td data-label="Pemeriksaan terakhir">
                        {examination ? (
                          <div className="lansia-examination">
                            <time dateTime={examination.examined_at}>{formatExaminationDate(examination.examined_at)}</time>
                            {examination.officer_notes?.trim() && <p>{examination.officer_notes}</p>}
                          </div>
                        ) : <span className="lansia-empty-value">Belum ada pemeriksaan</span>}
                      </td>
                      {canManage && (
                        <td className="lansia-actions-column">
                          <div className="row-icons lansia-row-actions">
                            <Link
                              className="icon-btn"
                              href={buildHref({ edit: person.id, page: pageParam })}
                              aria-label={`Ubah ${person.name}`}
                            >
                              <EditIcon />
                            </Link>
                            <Link
                              className="icon-btn icon-btn-danger"
                              href={buildHref({ hapus: person.id, page: pageParam })}
                              aria-label={`Hapus ${person.name}`}
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

          {/* Table Footer with pagination */}
          <div className="schedule-footer">
            <p>
              Menampilkan <strong>{elderlyPeople.length}</strong> dari <strong>{total}</strong> data lansia terdaftar
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

      {/* Modal Tambah / Edit Lansia Sesuai Referensi Gambar */}
      {showForm && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="lansia-modal-title">
          <div className="anc-modal lansia-modal">
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
                    <circle cx="10" cy="4" r="2" />
                    <path d="M10 7v5l-3 4" />
                    <path d="M10 12l3 9" />
                    <path d="M14 10l2 2v9" />
                    <path d="M7 10h5" />
                  </svg>
                )}
              </div>
              <div className="anc-modal-heading">
                <div className="anc-modal-heading-row">
                  <h2 id="lansia-modal-title">
                    {editing ? 'Edit Data Lansia' : 'Tambah Data Lansia Baru'}
                  </h2>
                  <span className={`anc-badge ${editing ? 'anc-badge-pill' : 'anc-badge-pill'}`} style={{ color: '#0d8377', borderColor: '#99d6cc' }}>
                    {editing ? 'LANSIA REGISTRY • UPDATE' : 'POSYANDU LANSIA'}
                  </span>
                  {editing && (
                    <span className="anc-badge" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                      ID: LNS-001
                    </span>
                  )}
                </div>
                <p>
                  {editing
                    ? 'Perbarui data skrining berkala, tingkat kemandirian, dan catatan kesehatan lansia Desa Sindang Sari.'
                    : 'Pencatatan skrining kesehatan lansia, deteksi faktor risiko PTM, dan pemantauan kemandirian Desa Sindang Sari.'}
                </p>
              </div>
              <Link className="anc-modal-close" href={closeHref} aria-label="Tutup form">
                <CloseIcon />
              </Link>
            </div>

            {/* Form Modal Sesuai Layout Referensi */}
            <form action={editing ? updateElderlyPerson : createElderlyPerson} className="anc-modal-form">
              {editing && <input type="hidden" name="id" value={editing.id} />}

              {/* ===================================================
                  KONDISI EDIT DATA LANSIA
                  =================================================== */}
              {editing ? (
                <>
                  {/* Bagian 1: Identitas Lansia & Penanggung Jawab */}
                  <div className="anc-section-card">
                    <div className="anc-section-head">
                      <div className="anc-section-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d8377" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="16" rx="3" />
                          <path d="M7 8h10M7 12h10M7 16h6" />
                        </svg>
                        <h3>1. Identitas Lansia &amp; Penanggung Jawab</h3>
                      </div>
                    </div>

                    <div className="anc-grid-2">
                      <div className="anc-field">
                        <label className="anc-label">
                          <span>Nama Lengkap Lansia <span className="req">*</span></span>
                        </label>
                        <div className="anc-input-group">
                          <input
                            name="name"
                            required
                            defaultValue={editing.name || 'Tn. Suherman'}
                            placeholder="cth. Tn. Suherman"
                            className="anc-input no-icon"
                          />
                          <span className="anc-input-append" style={{ right: 12 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a8.38 8.38 0 0 1 13 0"/></svg>
                          </span>
                        </div>
                      </div>

                      <div className="anc-field">
                        <label className="anc-label">
                          <span>Jenis Kelamin <span className="req">*</span></span>
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20, minHeight: 42 }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, color: '#096d62', cursor: 'pointer' }}>
                            <input type="radio" name="gender" value="Laki-laki" defaultChecked style={{ accentColor: '#096d62', width: 16, height: 16 }} />
                            Laki-laki
                          </label>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                            <input type="radio" name="gender" value="Perempuan" style={{ accentColor: '#096d62', width: 16, height: 16 }} />
                            Perempuan
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="lansia-edit-grid-3" style={{ marginTop: 4 }}>
                      <div className="anc-field">
                        <label className="anc-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8 }}>
                          <span>Tanggal Lahir &amp; Usia</span>
                          <span style={{ background: '#e6f6f4', color: '#0d8377', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                            68 Tahun
                          </span>
                        </label>
                        <div className="anc-input-group">
                          <input
                            name="birthDateDisplay"
                            defaultValue="12/04/1956 (68 Thn)"
                            className="anc-input no-icon"
                          />
                          <span className="anc-input-append">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          </span>
                        </div>
                      </div>

                      <div className="anc-field">
                        <label className="anc-label">
                          <span>Nama Penanggung Jawab (Keluarga)</span>
                        </label>
                        <div className="anc-input-group">
                          <input
                            name="guardianName"
                            defaultValue="Ahmad"
                            className="anc-input no-icon"
                          />
                          <span className="anc-input-append">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                          </span>
                        </div>
                      </div>

                      <div className="anc-field">
                        <label className="anc-label">
                          <span>Hubungan Keluarga</span>
                        </label>
                        <div className="anc-input-group">
                          <select name="guardianRelation" defaultValue="Anak Kandung" className="anc-select" style={{ paddingLeft: 14 }}>
                            <option value="Anak Kandung">Anak Kandung</option>
                            <option value="Pasangan (Suami/Istri)">Pasangan (Suami/Istri)</option>
                            <option value="Cucu">Cucu</option>
                            <option value="Kerabat / Lainnya">Kerabat / Lainnya</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="anc-grid-2" style={{ marginTop: 4 }}>
                      <div className="anc-field">
                        <label className="anc-label">
                          <span>Nomor HP Penanggung Jawab</span>
                        </label>
                        <div className="anc-input-group">
                          <input
                            name="guardianPhone"
                            defaultValue="081234567890"
                            className="anc-input no-icon"
                          />
                          <span className="anc-input-append">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
                          </span>
                        </div>
                      </div>

                      <div className="anc-field">
                        <label className="anc-label">
                          <span>Alamat Domisili Desa Sindang Sari</span>
                        </label>
                        <div className="anc-input-group">
                          <input
                            name="address"
                            defaultValue="Dusun Sindanghurip RT 01 / RW 03"
                            className="anc-input no-icon"
                          />
                          <span className="anc-input-append">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bagian 2: Hasil Pemeriksaan Kesehatan & Skrining Kemandirian */}
                  <div className="anc-section-card" style={{ borderTop: '1px dashed #d9e6e0', paddingTop: 16 }}>
                    <div className="anc-section-head">
                      <div className="anc-section-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d8377" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                        <h3>2. Hasil Pemeriksaan Kesehatan &amp; Skrining Kemandirian</h3>
                      </div>
                      <span style={{ color: '#0d8377', background: '#e6f6f4', border: '1px solid #99d6cc', borderRadius: 999, padding: '4px 12px', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg> Kondisi Terkontrol
                      </span>
                    </div>

                    <div className="anc-field">
                      <label className="anc-label">
                        <span>Posyandu Lansia Pembina</span>
                      </label>
                      <div className="anc-input-group">
                        <select
                          name="posyanduId"
                          defaultValue={editing.posyandu_id ?? ''}
                          className="anc-select"
                          style={{ paddingLeft: 14 }}
                        >
                          {posyandu.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} {item.name.toLowerCase().includes('dusun') ? '' : '(Dusun Sindanghurip)'}
                            </option>
                          ))}
                        </select>
                        <span className="anc-input-append">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                        </span>
                      </div>
                    </div>

                    <div className="lansia-vitals-4">
                      <div className="anc-field">
                        <label className="anc-label">
                          <span>Tekanan Darah (TD)</span>
                        </label>
                        <div className="anc-input-group">
                          <input name="bloodPressure" defaultValue="125/80" className="anc-input no-icon" />
                          <span className="anc-input-append">mmHg</span>
                        </div>
                      </div>

                      <div className="anc-field">
                        <label className="anc-label">
                          <span>Gula Darah (GDS)</span>
                        </label>
                        <div className="anc-input-group">
                          <input name="bloodSugar" defaultValue="110" className="anc-input no-icon" />
                          <span className="anc-input-append">mg/dL</span>
                        </div>
                      </div>

                      <div className="anc-field">
                        <label className="anc-label">
                          <span>Asam Urat</span>
                        </label>
                        <div className="anc-input-group">
                          <input name="uricAcid" defaultValue="5.2" className="anc-input no-icon" />
                          <span className="anc-input-append">mg/dL</span>
                        </div>
                      </div>

                      <div className="anc-field">
                        <label className="anc-label">
                          <span>BB &amp; TB</span>
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                          <div className="anc-input-group">
                            <input name="weight" defaultValue="62" className="anc-input no-icon" />
                            <span className="anc-input-append">kg</span>
                          </div>
                          <div className="anc-input-group">
                            <input name="height" defaultValue="165" className="anc-input no-icon" />
                            <span className="anc-input-append">cm</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="anc-grid-2">
                      <div className="anc-field">
                        <label className="anc-label">
                          <span>Tingkat Kemandirian (Aktivitas Sehari-hari)</span>
                        </label>
                        <div className="anc-input-group">
                          <input
                            name="aks"
                            defaultValue="Mandiri (Kategori A) - Tidak Butuh Bantuan"
                            className="anc-input no-icon"
                            style={{ color: '#0d8377', fontWeight: 700 }}
                          />
                          <span className="anc-input-append">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="2"/><path d="m9 20 3-6 3 6"/><path d="m6 8 6 2 6-2"/><path d="M12 10v4"/></svg>
                          </span>
                        </div>
                      </div>

                      <div className="anc-field">
                        <label className="anc-label">
                          <span>Status Risiko Kesehatan</span>
                        </label>
                        <div className="anc-input-group">
                          <input
                            name="healthRisk"
                            defaultValue="Sehat Terkontrol"
                            className="anc-input no-icon"
                            style={{ color: '#0f2f2b', fontWeight: 600 }}
                          />
                          <span className="anc-input-append">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="anc-field full">
                      <label className="anc-label">
                        <span>Catatan Petugas / Evaluasi Bidan Desa</span>
                      </label>
                      <textarea
                        name="notes"
                        rows={2}
                        defaultValue="Kondisi fisik lansia prima, aktivitas mandiri jalan pagi rutin, tekanan darah dan gula darah stabil terkontrol."
                        className="anc-input no-icon"
                        style={{ minHeight: 64, paddingTop: 10, resize: 'vertical' }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* ===================================================
                   KONDISI TAMBAH DATA LANSIA BARU
                   =================================================== */
                <>
                  {/* Bagian 1: Identitas & Informasi Lansia */}
                  <div className="anc-section-card">
                    <div className="anc-section-head">
                      <div className="anc-section-title">
                        <span className="lansia-step-num">1</span>
                        <div>
                          <h3>Identitas &amp; Informasi Lansia</h3>
                          <div className="lansia-section-desc">Kelengkapan data pokok warga binaan lansia tanpa NIK</div>
                        </div>
                      </div>
                    </div>

                    <div className="anc-grid-2">
                      <div className="anc-field">
                        <label className="anc-label">
                          <span>Nama Lengkap Lansia <span className="req">*</span></span>
                        </label>
                        <div className="anc-input-group">
                          <input
                            name="name"
                            required
                            placeholder="cth. Tn. Suherman"
                            className="anc-input no-icon"
                          />
                          <span className="anc-input-append">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a8.38 8.38 0 0 1 13 0"/></svg>
                          </span>
                        </div>
                      </div>

                      <div className="anc-field">
                        <label className="anc-label">
                          <span>Jenis Kelamin <span className="req">*</span></span>
                        </label>
                        <div className="lansia-gender-group">
                          <label className="lansia-gender-option active">
                            <input type="radio" name="gender" value="Laki-laki" defaultChecked />
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="3"/><path d="M12 8v8M9 12h6M9 20l3-4 3 4"/></svg>
                            Laki-laki
                          </label>
                          <label className="lansia-gender-option">
                            <input type="radio" name="gender" value="Perempuan" />
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="3"/><path d="M12 8v8M9 13h6M12 16v5"/></svg>
                            Perempuan
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="anc-grid-2" style={{ marginTop: 4 }}>
                      <div className="anc-field">
                        <label className="anc-label">
                          <span>Tanggal Lahir <span className="req">*</span></span>
                        </label>
                        <div className="anc-input-group">
                          <input
                            type="date"
                            name="birthDate"
                            defaultValue="1956-03-12"
                            className="anc-input no-icon"
                          />
                          <span className="anc-input-append">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          </span>
                        </div>
                      </div>

                      <div className="anc-field">
                        <label className="anc-label">
                          <span>Usia Saat Ini (Kalkulasi)</span>
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="lansia-calc-box" style={{ flex: 1, justifyContent: 'space-between' }}>
                            <span>68 Thn</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><path d="M12 11v6"/></svg>
                          </div>
                          <span className="anc-badge anc-badge-pill" style={{ color: '#0d8377', borderColor: '#99d6cc', padding: '9px 14px', fontSize: 12 }}>
                            Lansia Madya
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="lansia-edit-grid-3" style={{ marginTop: 4 }}>
                      <div className="anc-field">
                        <label className="anc-label">
                          <span>Penanggung Jawab / Keluarga <span className="req">*</span></span>
                        </label>
                        <div className="anc-input-group">
                          <input
                            name="guardianName"
                            placeholder="cth. Ahmad Fauzi"
                            className="anc-input no-icon"
                          />
                        </div>
                      </div>

                      <div className="anc-field">
                        <label className="anc-label">
                          <span>Hubungan Keluarga <span className="req">*</span></span>
                        </label>
                        <div className="anc-input-group">
                          <select name="guardianRelation" defaultValue="Anak Kandung" className="anc-select" style={{ paddingLeft: 14 }}>
                            <option value="Anak Kandung">Anak Kandung</option>
                            <option value="Pasangan (Suami/Istri)">Pasangan (Suami/Istri)</option>
                            <option value="Cucu">Cucu</option>
                            <option value="Kerabat / Keluarga Lainnya">Kerabat / Keluarga Lainnya</option>
                          </select>
                        </div>
                      </div>

                      <div className="anc-field">
                        <label className="anc-label">
                          <span>No. WhatsApp / HP Keluarga</span>
                        </label>
                        <div className="anc-input-group">
                          <input
                            name="guardianPhone"
                            placeholder="0812xxxxxxxx"
                            className="anc-input no-icon"
                          />
                          <span className="anc-input-append">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d8377" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="anc-field full" style={{ marginTop: 4 }}>
                      <label className="anc-label">
                        <span>Alamat Domisili / RT-RW <span className="req">*</span></span>
                      </label>
                      <div className="anc-input-group">
                        <input
                          name="address"
                          defaultValue="Dusun Sindanghurip RT 01 / RW 03"
                          placeholder="Dusun Sindanghurip RT 01 / RW 03"
                          className="anc-input no-icon"
                        />
                        <span className="anc-input-append">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bagian 2: Skrining Kesehatan Awal & Tingkat Kemandirian */}
                  <div className="anc-section-card" style={{ borderTop: '1px dashed #d9e6e0', paddingTop: 16 }}>
                    <div className="anc-section-head">
                      <div className="anc-section-title">
                        <span className="lansia-step-num">2</span>
                        <div>
                          <h3>Skrining Kesehatan Awal &amp; Tingkat Kemandirian</h3>
                          <div className="lansia-section-desc">Pemeriksaan tanda vital, risiko metabolik, dan kemandirian AKS</div>
                        </div>
                      </div>
                    </div>

                    <div className="anc-field">
                      <label className="anc-label">
                        <span>Posyandu Pembina Domisili <span className="req">*</span></span>
                      </label>
                      <div className="anc-input-group">
                        <select
                          name="posyanduId"
                          required
                          defaultValue={posyandu[0]?.id ?? ''}
                          className="anc-select"
                          style={{ paddingLeft: 14 }}
                        >
                          <option value="" disabled>Pilih Posyandu Pembina</option>
                          {posyandu.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} - Dusun Sindang Sari (Bina Lansia Rutin)
                            </option>
                          ))}
                        </select>
                        <span className="anc-input-append">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                        </span>
                      </div>
                    </div>

                    <div className="lansia-vitals-4">
                      <div className="anc-field">
                        <label className="anc-label">
                          <span>Tekanan Darah (TD)</span>
                        </label>
                        <div className="anc-input-group">
                          <input name="bloodPressure" defaultValue="120/80" placeholder="120/80" className="anc-input no-icon" />
                          <span className="anc-input-append">mmHg</span>
                        </div>
                      </div>

                      <div className="anc-field">
                        <label className="anc-label">
                          <span>Gula Darah (GDS)</span>
                        </label>
                        <div className="anc-input-group">
                          <input name="bloodSugar" defaultValue="110" placeholder="110" className="anc-input no-icon" />
                          <span className="anc-input-append">mg/dL</span>
                        </div>
                      </div>

                      <div className="anc-field">
                        <label className="anc-label">
                          <span>Kolesterol</span>
                        </label>
                        <div className="anc-input-group">
                          <input name="cholesterol" defaultValue="180" placeholder="180" className="anc-input no-icon" />
                          <span className="anc-input-append">mg/dL</span>
                        </div>
                      </div>

                      <div className="anc-field">
                        <label className="anc-label">
                          <span>Asam Urat</span>
                        </label>
                        <div className="anc-input-group">
                          <input name="uricAcid" defaultValue="5.2" placeholder="5.2" className="anc-input no-icon" />
                          <span className="anc-input-append">mg/dL</span>
                        </div>
                      </div>
                    </div>

                    <div className="lansia-antropo-row">
                      <div className="anc-field">
                        <label className="anc-label">
                          <span>Berat Badan (BB)</span>
                        </label>
                        <div className="anc-input-group">
                          <input name="weight" defaultValue="58.5" placeholder="58.5" className="anc-input no-icon" />
                          <span className="anc-input-append">kg</span>
                        </div>
                      </div>

                      <div className="anc-field">
                        <label className="anc-label">
                          <span>Tinggi Badan (TB)</span>
                        </label>
                        <div className="anc-input-group">
                          <input name="height" defaultValue="162" placeholder="162" className="anc-input no-icon" />
                          <span className="anc-input-append">cm</span>
                        </div>
                      </div>

                      <div className="anc-field">
                        <label className="anc-label">
                          <span>Estimasi Status IMT Lansia</span>
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="lansia-calc-box" style={{ flex: 1 }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><path d="M8 10h.01"/><path d="M12 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/></svg>
                            <span>22.3 kg/m²</span>
                          </div>
                          <span className="lansia-badge-tag">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                            Gizi Normal / Baik
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="anc-field full">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <label className="anc-label" style={{ margin: 0 }}>
                          <span>Tingkat Kemandirian Aktivitas Keseharian (AKS) <span className="req">*</span></span>
                        </label>
                        <span style={{ fontSize: 11, color: '#64748b' }}>Kategori Penilaian Kemenkes</span>
                      </div>

                      <div className="lansia-aks-cards">
                        <label className="lansia-aks-card active">
                          <input type="radio" name="aks" value="Mandiri (Kategori A)" defaultChecked style={{ display: 'none' }} />
                          <h4>Mandiri (Kategori A)</h4>
                          <p>Mampu makan, mandi, berpakaian, dan mobilisasi tanpa bantuan orang lain.</p>
                        </label>

                        <label className="lansia-aks-card">
                          <input type="radio" name="aks" value="Pendampingan Ringan (B)" style={{ display: 'none' }} />
                          <h4>Pendampingan Ringan (B)</h4>
                          <p>Perlu sedikit bantuan dalam berjalan, mengambil obat, atau membersihkan diri.</p>
                        </label>

                        <label className="lansia-aks-card">
                          <input type="radio" name="aks" value="Ketergantungan Total (C)" style={{ display: 'none' }} />
                          <h4>Ketergantungan Total (C)</h4>
                          <p>Tirah baring (bedridden), memerlukan asuhan menyeluruh dari pendamping.</p>
                        </label>
                      </div>
                    </div>

                    <div className="anc-field full">
                      <label className="anc-label">
                        <span>Catatan Keluhan / Terapi Obat Rutin (Opsional)</span>
                      </label>
                      <textarea
                        name="notes"
                        rows={2}
                        placeholder="cth. Riwayat rutin minum Amlodipine 5mg dari Puskesmas, nyeri sendi lutut kanan saat berdiri lama."
                        className="anc-input no-icon"
                        style={{ minHeight: 64, paddingTop: 10, resize: 'vertical' }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Footer Modal */}
              <div className="anc-modal-footer">
                {editing ? (
                  <div className="anc-officer-meta">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0d8377" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                    <span>Pembaruan data tersinkronisasi dengan Kohort Lansia Sindang Sari</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="lansia-avatar-badge">
                      {((profile.full_name || 'Crisman Turnip').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()) || 'CT'}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Petugas Pencatat</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f2f2b' }}>
                        Bidan Desa: {profile.full_name || 'Crisman Turnip'}
                      </div>
                    </div>
                  </div>
                )}

                <div className="anc-footer-actions">
                  <Link className="anc-btn-cancel" href={closeHref}>
                    Batal
                  </Link>
                  <button className="anc-btn-submit" type="submit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    {editing ? 'Simpan Perubahan' : '+ Simpan Data Lansia'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hapus Lansia */}
      {!showForm && deleting && (
        <Modal closeHref={closeHref} labelledBy="delete-modal-title" tone="danger">
          <div className="modal-head">
            <div className="modal-icon danger">
              <TrashIcon size={22} />
            </div>
            <div className="modal-titles">
              <p className="modal-eyebrow danger">Konfirmasi Penghapusan</p>
              <h2 id="delete-modal-title">Hapus Data Lansia?</h2>
            </div>
            <Link className="modal-close" href={closeHref} aria-label="Tutup">
              <CloseIcon />
            </Link>
          </div>
          <div className="modal-body">
            <p>
              Apakah Anda yakin ingin menghapus data lansia <strong>{deleting.name}</strong>? Data riwayat pemeriksaan yang terkait tidak akan tampil lagi di daftar utama.
            </p>
            <form action={softDeleteElderlyPerson} className="delete-actions">
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
