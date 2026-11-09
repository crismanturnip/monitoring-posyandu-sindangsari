'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { scheduleCategoryKeys, scheduleCategoryLabels, type ScheduleCategory } from '@/lib/schedule-categories';

type PosyanduOption = { id: string; name: string; address: string | null };
export type ScheduleFormValues = {
  id?: string; title: string; posyanduId: string; category: ScheduleCategory | ''; location: string;
  description: string; date: string; startTime: string; endTime: string;
};

const MAX_TITLE = 80;
const MAX_DESCRIPTION = 300;

function Svg({ children }: { children: ReactNode }) {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}
const CalendarIcon = () => <Svg><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Svg>;
const UsersIcon = () => <Svg><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.5A6.5 6.5 0 0 1 21.5 20" /></Svg>;
const PinIcon = () => <Svg><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></Svg>;
const ClockIcon = () => <Svg><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>;
const HourglassIcon = () => <Svg><path d="M6 2h12M6 22h12M7 2v4a5 5 0 0 0 2 4l3 2-3 2a5 5 0 0 0-2 4v4M17 2v4a5 5 0 0 1-2 4l-3 2 3 2a5 5 0 0 1 2 4v4" /></Svg>;
const InfoIcon = () => <Svg><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></Svg>;

const toMinutes = (time: string) => { const [hour, minute] = time.split(':').map(Number); return hour * 60 + minute; };
const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours ? `${hours} jam` : '', rest ? `${rest} menit` : ''].filter(Boolean).join(' ');
};

export function ScheduleForm({ action, posyandu, initial, error, submitLabel, closeHref, footerExtra }: {
  action: (formData: FormData) => void | Promise<void>;
  posyandu: PosyanduOption[];
  initial: ScheduleFormValues;
  error?: string;
  submitLabel: string;
  closeHref: string;
  footerExtra?: ReactNode;
}) {
  const [title, setTitle] = useState(initial.title);
  const [posyanduId, setPosyanduId] = useState(initial.posyanduId);
  const [category, setCategory] = useState(initial.category);
  const [location, setLocation] = useState(initial.location);
  const [locationTouched, setLocationTouched] = useState(Boolean(initial.id));
  const [description, setDescription] = useState(initial.description);
  const [date, setDate] = useState(initial.date);
  const [startTime, setStartTime] = useState(initial.startTime);
  const [endTime, setEndTime] = useState(initial.endTime);

  const duration = startTime && endTime ? toMinutes(endTime) - toMinutes(startTime) : null;
  const invalidRange = duration !== null && duration <= 0;

  const changePosyandu = (id: string) => {
    setPosyanduId(id);
    if (!locationTouched) setLocation(posyandu.find((item) => item.id === id)?.address ?? '');
  };

  return <form action={action} className="sch-form">
    {initial.id && <input type="hidden" name="id" value={initial.id} />}
    {error && <div className="form-error" role="alert">{error}</div>}

    <section className="sch-step">
      <div className="sch-step-head"><h3>Informasi Kegiatan &amp; Pos</h3><span className="step-count">Langkah 1/3</span></div>
      <div className="sch-label-row"><label htmlFor="sch-title">Nama Kegiatan <span className="req">*</span></label><span className="hint">{title.length}/{MAX_TITLE} karakter</span></div>
      <div className="input-icon"><CalendarIcon /><input id="sch-title" name="title" required maxLength={MAX_TITLE} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Contoh: Posyandu Balita & Imunisasi Rutin" /></div>
      <div className="sch-two">
        <div className="sch-field">
          <label htmlFor="sch-category">Kategori Sasaran <span className="req">*</span></label>
          <div className="input-icon"><UsersIcon /><select id="sch-category" name="targetCategory" required value={category} onChange={(event) => setCategory(event.target.value as ScheduleCategory)}>
            <option value="" disabled>Pilih kategori</option>
            {scheduleCategoryKeys.map((key) => <option key={key} value={key}>{scheduleCategoryLabels[key]}</option>)}
          </select></div>
        </div>
        <div className="sch-field">
          <label htmlFor="sch-posyandu">Lokasi Posyandu <span className="req">*</span></label>
          <div className="input-icon"><PinIcon /><select id="sch-posyandu" name="posyanduId" required value={posyanduId} onChange={(event) => changePosyandu(event.target.value)}>
            <option value="" disabled>Pilih Posyandu</option>
            {posyandu.map((item) => <option key={item.id} value={item.id}>{item.address ? `${item.name} - ${item.address}` : item.name}</option>)}
          </select></div>
        </div>
      </div>
      {category && <p className="sch-feedback">✓ Kategori Terpilih: {scheduleCategoryLabels[category]}</p>}
      <label htmlFor="sch-location">Detail lokasi kegiatan <span className="req">*</span></label>
      <div className="input-icon"><PinIcon /><input id="sch-location" name="location" required maxLength={160} value={location} onChange={(event) => { setLocation(event.target.value); setLocationTouched(true); }} placeholder="Contoh: Balai Dusun Sindanghurip RT 01" /></div>
    </section>

    <section className="sch-step step-2">
      <div className="sch-step-head"><h3>Waktu Pelaksanaan</h3><span className="step-count">Langkah 2/3</span></div>
      <div className="sch-three">
        <div className="sch-field"><label htmlFor="sch-date">Tanggal Pelaksanaan <span className="req">*</span></label><div className="input-icon"><CalendarIcon /><input id="sch-date" name="date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></div></div>
        <div className="sch-field"><label htmlFor="sch-start">Waktu Mulai (WIB) <span className="req">*</span></label><div className="input-icon"><ClockIcon /><input id="sch-start" name="startTime" type="time" required value={startTime} onChange={(event) => setStartTime(event.target.value)} /></div></div>
        <div className="sch-field"><label htmlFor="sch-end">Waktu Selesai (WIB) <span className="req">*</span></label><div className="input-icon"><HourglassIcon /><input id="sch-end" name="endTime" type="time" required value={endTime} onChange={(event) => setEndTime(event.target.value)} /></div></div>
      </div>
      {invalidRange
        ? <div className="sch-info error" role="alert"><InfoIcon /><span>Waktu selesai harus setelah waktu mulai.</span></div>
        : <div className="sch-info"><InfoIcon /><span>{duration ? `Durasi pelayanan: ${formatDuration(duration)} (disarankan mempersiapkan meja pendaftaran 15 menit sebelum mulai)` : 'Isi waktu mulai dan selesai untuk melihat durasi pelayanan.'}</span></div>}
    </section>

    <section className="sch-step step-3">
      <div className="sch-step-head"><h3>Deskripsi Kegiatan</h3><span className="step-count">Langkah 3/3</span></div>
      <div className="sch-label-row"><label htmlFor="sch-description">Deskripsi singkat (opsional)</label><span className="hint">{description.length}/{MAX_DESCRIPTION} karakter</span></div>
      <textarea id="sch-description" name="description" rows={3} maxLength={MAX_DESCRIPTION} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Contoh: Penimbangan, pengukuran KMS, dan imunisasi Polio/DPT-HB-Hib" />
    </section>

    <footer className="sch-footer">
      {footerExtra}
      <span className="spacer" />
      <Link className="ghost-btn" href={closeHref}>Batal</Link>
      <button className="primary-btn" type="submit" disabled={invalidRange || posyandu.length === 0}>{submitLabel}</button>
    </footer>
  </form>;
}
