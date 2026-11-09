import Link from 'next/link';
import type { ReactNode } from 'react';
import { cancelSchedule, createSchedule, deleteSchedule, updateSchedule } from './actions';
import { requireActiveProfile } from '@/lib/auth';
import { PageHero } from '@/components/page-hero';
import { Modal } from '@/components/modal';
import { ScheduleForm, type ScheduleFormValues } from '@/components/schedule-form';
import { agendaCode, scheduleCategoryKeys, scheduleCategoryLabels, type ScheduleCategory } from '@/lib/schedule-categories';

type Schedule = {
  id: string; title: string; description: string | null; starts_at: string; ends_at: string | null; location: string;
  status: 'TERJADWAL' | 'SELESAI' | 'DIBATALKAN'; target_category: ScheduleCategory; posyandu_id: string; posyandu: { name: string } | null;
};
type Posyandu = { id: string; name: string; address: string | null };
type Params = { q?: string; posyandu?: string; kategori?: string; page?: string; tambah?: string; edit?: string; hapus?: string; error?: string };

const PAGE_SIZE = 10;
const columns = 'id, title, description, starts_at, ends_at, location, status, target_category, posyandu_id, posyandu(name)';
const statusLabels = { TERJADWAL: 'Terjadwal', SELESAI: 'Selesai', DIBATALKAN: 'Dibatalkan' };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Svg({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}
const SearchIcon = () => <Svg><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>;
const PlusIcon = () => <Svg><path d="M12 5v14M5 12h14" /></Svg>;
const ResetIcon = () => <Svg><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></Svg>;
const ClockIcon = () => <Svg><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>;
const PinIcon = () => <Svg><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></Svg>;
const EditIcon = () => <Svg><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></Svg>;
const TrashIcon = ({ size }: { size?: number }) => <Svg size={size}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m19 6-1 14H6L5 6" /></Svg>;
const CloseIcon = () => <Svg size={18}><path d="M18 6 6 18M6 6l12 12" /></Svg>;
const CalendarPlusIcon = () => <Svg size={24}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4" /></Svg>;
const CalendarEditIcon = () => <Svg size={24}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="m10 17 5-5 1.5 1.5-5 5H10Z" /></Svg>;
const WarningIcon = () => <Svg size={18}><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17h.01" /></Svg>;

function ModalHeader({ icon, eyebrow, chip, mono, title, description, titleId, closeHref }: {
  icon: ReactNode; eyebrow: string; chip: string; mono?: boolean; title: string; description: string; titleId: string; closeHref: string;
}) {
  return <div className="modal-head">
    <div className="modal-icon">{icon}</div>
    <div className="modal-titles">
      <div className="modal-tags"><p className="modal-eyebrow">{eyebrow}</p><span className={`modal-chip${mono ? ' mono' : ''}`}>{chip}</span></div>
      <h2 id={titleId}>{title}</h2>
      <p className="modal-desc">{description}</p>
    </div>
    <Link className="modal-close" href={closeHref} aria-label="Tutup"><CloseIcon /></Link>
  </div>;
}

export default async function SchedulePage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const { profile, supabase } = await requireActiveProfile();
  const canManage = profile.role === 'BIDAN';

  const q = (params.q ?? '').replace(/[,()%*\\]/g, ' ').trim().slice(0, 80);
  const posyanduFilter = uuidPattern.test(params.posyandu ?? '') ? String(params.posyandu) : '';
  const categoryFilter = params.kategori && params.kategori in scheduleCategoryLabels ? params.kategori : '';
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  let listQuery = supabase.from('schedules').select(columns, { count: 'exact' });
  if (q) listQuery = listQuery.or(`title.ilike.%${q}%,location.ilike.%${q}%`);
  if (posyanduFilter) listQuery = listQuery.eq('posyandu_id', posyanduFilter);
  if (categoryFilter) listQuery = listQuery.eq('target_category', categoryFilter);
  listQuery = listQuery.order('starts_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);

  const editId = canManage && uuidPattern.test(params.edit ?? '') ? String(params.edit) : '';
  const deleteId = canManage && uuidPattern.test(params.hapus ?? '') ? String(params.hapus) : '';
  const [{ data: schedulesData, count }, { data: posyanduData }, { data: editData }, { data: deleteData }] = await Promise.all([
    listQuery,
    supabase.from('posyandu').select('id, name, address').eq('is_active', true).order('name'),
    editId ? supabase.from('schedules').select(columns).eq('id', editId).maybeSingle() : Promise.resolve({ data: null }),
    deleteId ? supabase.from('schedules').select(columns).eq('id', deleteId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const schedules = (schedulesData ?? []) as unknown as Schedule[];
  const posyandu = (posyanduData ?? []) as Posyandu[];
  const editing = editData as unknown as Schedule | null;
  const deleting = deleteData as unknown as Schedule | null;
  const showForm = canManage && (params.tambah === '1' || Boolean(editing));
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (extra: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries({ q, posyandu: posyanduFilter, kategori: categoryFilter, ...extra })) if (value) search.set(key, value);
    const text = search.toString();
    return text ? `/jadwal?${text}` : '/jadwal';
  };
  const pageParam = page > 1 ? String(page) : undefined;
  const closeHref = buildHref({ page: pageParam });
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => Math.max(1, Math.min(page - 2, totalPages - 4)) + index);

  const formatDay = (date: string) => new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date(date));
  const formatTime = (date: string) => new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Jakarta' }).format(new Date(date)).replace('.', ':');
  const timeRange = (schedule: Schedule) => `${formatTime(schedule.starts_at)}${schedule.ends_at ? ` - ${formatTime(schedule.ends_at)}` : ''} WIB`;
  const inputDateTime = (date: string | null) => {
    if (!date) return '';
    const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(date));
    const value = (part: string) => parts.find((item) => item.type === part)?.value ?? '';
    return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`;
  };

  const startValue = inputDateTime(editing?.starts_at ?? null);
  const endValue = inputDateTime(editing?.ends_at ?? null);
  const initial: ScheduleFormValues = editing
    ? { id: editing.id, title: editing.title, posyanduId: editing.posyandu_id, category: editing.target_category, location: editing.location, description: editing.description ?? '', date: startValue.slice(0, 10), startTime: startValue.slice(11, 16), endTime: endValue.slice(11, 16) }
    : { title: '', posyanduId: '', category: '', location: '', description: '', date: '', startTime: '', endTime: '' };

  return <div className="schedule-page">
    <PageHero profile={profile} description="Ringkasan operasional dan monitoring Posyandu Desa Sindangsari." />
    <section className="content">
      <nav className="breadcrumb" aria-label="Breadcrumb"><span>Pelayanan Posyandu</span><span>Desa Sindangsari</span><span aria-current="page">Jadwal Kegiatan</span></nav>
      <div className="page-heading">
        <div><h1>Jadwal Kegiatan</h1><p>Pencatatan dan agenda operasional posyandu balita, ibu hamil, dan lansia di wilayah kerja Desa Sindangsari.</p></div>
        {canManage && <Link className="primary-btn" href={buildHref({ tambah: '1', page: pageParam })}><PlusIcon />Tambah Jadwal Kegiatan</Link>}
      </div>

      <form className="card filter-bar" action="/jadwal" method="get">
        <label className="filter-search"><SearchIcon /><input name="q" defaultValue={q} placeholder="Cari nama kegiatan atau lokasi pos dusun..." /></label>
        <select name="posyandu" defaultValue={posyanduFilter} aria-label="Filter Posyandu"><option value="">Semua Posyandu</option>{posyandu.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select name="kategori" defaultValue={categoryFilter} aria-label="Filter kategori sasaran"><option value="">Kategori Sasaran (Semua)</option>{scheduleCategoryKeys.map((key) => <option key={key} value={key}>{scheduleCategoryLabels[key]}</option>)}</select>
        <button className="primary-btn" type="submit">Terapkan</button>
        <Link className="ghost-btn" href="/jadwal"><ResetIcon />Reset</Link>
      </form>

      <section className="card schedule-table-card">
        <div className="schedule-table-wrap">
          <table className="schedule-table">
            <thead><tr><th>No</th><th>Tanggal &amp; Waktu</th><th>Nama Kegiatan</th><th>Kategori Sasaran</th><th>Lokasi Posyandu</th>{canManage && <th>Aksi</th>}</tr></thead>
            <tbody>
              {schedules.length === 0 && <tr><td colSpan={canManage ? 6 : 5}><div className="empty">Belum ada jadwal yang cocok dengan pencarian Anda.</div></td></tr>}
              {schedules.map((schedule, index) => <tr key={schedule.id} className={schedule.status === 'DIBATALKAN' ? 'is-cancelled' : undefined}>
                <td className="cell-no">{from + index + 1}</td>
                <td><strong>{formatDay(schedule.starts_at)}</strong><span className="time"><ClockIcon />{timeRange(schedule)}</span></td>
                <td><strong>{schedule.title}</strong>{schedule.description && <span className="desc">{schedule.description}</span>}{schedule.status !== 'TERJADWAL' && <span className={`status ${schedule.status.toLowerCase()}`}>{statusLabels[schedule.status]}</span>}</td>
                <td><span className={`badge badge-${schedule.target_category.toLowerCase()}`}>{scheduleCategoryLabels[schedule.target_category]}</span></td>
                <td><strong>{schedule.posyandu?.name ?? 'Posyandu'}</strong><span className="desc">{schedule.location}</span></td>
                {canManage && <td><div className="row-icons">
                  <Link className="icon-btn" href={buildHref({ edit: schedule.id, page: pageParam })} aria-label={`Ubah ${schedule.title}`}><EditIcon /></Link>
                  <Link className="icon-btn icon-btn-danger" href={buildHref({ hapus: schedule.id, page: pageParam })} aria-label={`Hapus ${schedule.title}`}><TrashIcon /></Link>
                </div></td>}
              </tr>)}
            </tbody>
          </table>
        </div>
        <div className="schedule-footer">
          <p>Menampilkan <strong>{schedules.length}</strong> dari <strong>{total}</strong> jadwal kegiatan terdaftar</p>
          <nav className="pagination" aria-label="Halaman">
            {page > 1 ? <Link className="ghost-btn" href={buildHref({ page: String(page - 1) })}>Sebelumnya</Link> : <span className="ghost-btn disabled">Sebelumnya</span>}
            {pageNumbers.map((number) => <Link key={number} className={`page-number${number === page ? ' active' : ''}`} href={buildHref({ page: String(number) })} aria-current={number === page ? 'page' : undefined}>{number}</Link>)}
            {page < totalPages ? <Link className="ghost-btn" href={buildHref({ page: String(page + 1) })}>Selanjutnya</Link> : <span className="ghost-btn disabled">Selanjutnya</span>}
          </nav>
        </div>
      </section>

      <aside className="coord-note"><div className="coord-icon">i</div><div><strong>Catatan Koordinasi Jadwal:</strong><p>Jadwal yang disimpan otomatis tampil di halaman Jadwal Publik. Pastikan logistik vaksin, suplemen vitamin A, dan PMT telah dikonfirmasi minimal H-2 pelaksanaan.</p></div></aside>
    </section>

    {showForm && <Modal closeHref={closeHref} labelledBy="schedule-modal-title">
      {editing
        ? <ModalHeader icon={<CalendarEditIcon />} eyebrow="Jadwal Registry • Update" chip={`ID: ${agendaCode(editing.id)}`} mono title="Edit Jadwal Kegiatan" description="Perbarui rincian agenda pelaksanaan, waktu, atau lokasi pelayanan posyandu." titleId="schedule-modal-title" closeHref={closeHref} />
        : <ModalHeader icon={<CalendarPlusIcon />} eyebrow="Agenda Posyandu" chip={`Tahun ${new Date().getFullYear()}`} title="Tambah Jadwal Kegiatan" description="Jadwalkan pelayanan kesehatan balita, ibu hamil, atau lansia di wilayah Desa Sindangsari." titleId="schedule-modal-title" closeHref={closeHref} />}
      <ScheduleForm
        key={editing?.id ?? 'new'}
        action={editing ? updateSchedule : createSchedule}
        posyandu={posyandu}
        initial={initial}
        error={params.error}
        submitLabel={editing ? 'Simpan Perubahan' : 'Simpan Jadwal'}
        closeHref={closeHref}
        footerExtra={editing && editing.status === 'TERJADWAL' ? <button className="secondary" type="submit" form="cancel-schedule-form">Batalkan jadwal</button> : null}
      />
      {editing && <form id="cancel-schedule-form" action={cancelSchedule}><input type="hidden" name="id" value={editing.id} /></form>}
    </Modal>}

    {!showForm && deleting && <Modal closeHref={closeHref} labelledBy="delete-modal-title" tone="danger">
      <div className="modal-head">
        <div className="modal-icon danger"><TrashIcon size={22} /></div>
        <div className="modal-titles"><p className="modal-eyebrow danger">Konfirmasi Penghapusan</p><h2 id="delete-modal-title">Hapus Jadwal Kegiatan?</h2></div>
        <Link className="modal-close" href={closeHref} aria-label="Tutup"><CloseIcon /></Link>
      </div>
      <div className="modal-body">
        <p>Apakah Anda yakin ingin menghapus agenda kegiatan ini? Data yang dihapus tidak dapat dikembalikan dan jadwal akan hilang dari halaman publik.</p>
        <div className="delete-summary">
          <div className="delete-summary-top"><span className={`badge badge-${deleting.target_category.toLowerCase()}`}>{scheduleCategoryLabels[deleting.target_category]}</span><span className="mono">ID Agenda: #{agendaCode(deleting.id)}</span></div>
          <strong>{deleting.title}</strong>
          {deleting.description && <p className="desc-line">{deleting.description}</p>}
          <hr />
          <p className="meta"><ClockIcon />{formatDay(deleting.starts_at)} • {timeRange(deleting)}</p>
          <p className="meta"><PinIcon />{deleting.posyandu?.name ?? 'Posyandu'} ({deleting.location})</p>
        </div>
        <div className="delete-warning"><WarningIcon /><span>Penghapusan bersifat permanen. Jika kegiatan hanya dibatalkan, gunakan tombol &quot;Batalkan jadwal&quot; pada menu ubah agar riwayatnya tetap tersimpan.</span></div>
        <form action={deleteSchedule} className="delete-actions">
          <input type="hidden" name="id" value={deleting.id} />
          <Link className="ghost-btn" href={closeHref}>Batal</Link>
          <button className="danger-btn" type="submit"><TrashIcon />Ya, Hapus Jadwal</button>
        </form>
      </div>
    </Modal>}
  </div>;
}
