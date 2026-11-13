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
                        <td>
                          <div className="row-icons" style={{ justifyContent: 'center' }}>
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

      {/* Modal Tambah / Edit Lansia */}
      {showForm && (
        <Modal closeHref={closeHref} labelledBy="lansia-modal-title">
          <div className="modal-head">
            <div className="modal-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="10" cy="4" r="2" />
                <path d="M10 7v5l-3 4" />
                <path d="M10 12l3 9" />
                <path d="M14 10l2 2v9" />
              </svg>
            </div>
            <div className="modal-titles">
              <div className="modal-tags">
                <p className="modal-eyebrow">Data Register Lansia</p>
              </div>
              <h2 id="lansia-modal-title">
                {editing ? 'Edit Data Lansia' : 'Tambah Data Lansia'}
              </h2>
              <p className="modal-desc">
                {editing
                  ? 'Perbarui informasi lansia di wilayah binaan Posyandu.'
                  : 'Catat data lansia baru untuk pemantauan pemeriksaan kesehatan rutin.'}
              </p>
            </div>
            <Link className="modal-close" href={closeHref} aria-label="Tutup">
              <CloseIcon />
            </Link>
          </div>

          <form action={editing ? updateElderlyPerson : createElderlyPerson} className="sch-form">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="sch-step">
              <label>
                Posyandu Binaan
                <select name="posyanduId" required defaultValue={editing?.posyandu_id ?? ''}>
                  <option value="" disabled>Pilih Posyandu</option>
                  {posyandu.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Nama Lengkap Lansia
                <input
                  name="name"
                  required
                  defaultValue={editing?.name ?? ''}
                  placeholder="Contoh: Tn. Suherman"
                />
              </label>
            </div>

            <div className="sch-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 0 24px' }}>
              <Link className="ghost-btn" href={closeHref}>
                Batal
              </Link>
              <button className="primary-btn" type="submit">
                {editing ? 'Simpan Perubahan' : 'Simpan Data Lansia'}
              </button>
            </div>
          </form>
        </Modal>
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
