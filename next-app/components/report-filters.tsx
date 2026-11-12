'use client';

import { useState } from 'react';
import type { ReportFilters } from '@/lib/reports';

export function ReportFiltersForm({ filters, posyandu }: {
  filters: ReportFilters;
  posyandu: { id: string; name: string }[];
}) {
  const [startDate, setStartDate] = useState(filters.startDate);
  const [endDate, setEndDate] = useState(filters.endDate);

  return <form className="report-filters" method="get" action="/laporan">
    <label>Kategori<select name="category" defaultValue={filters.category}><option value="semua">Semua</option><option value="balita">Bayi &amp; Balita</option><option value="ibu-hamil">Ibu Hamil</option><option value="lansia">Lansia</option></select></label>
    <label>Posyandu<select name="posyandu" defaultValue={filters.posyanduId}><option value="">Semua Posyandu yang dapat diakses</option>{posyandu.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Tanggal pemeriksaan awal<input name="start" type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} required /></label>
    <label>Tanggal pemeriksaan akhir<input name="end" type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} required /></label>
    <button type="submit">Tampilkan</button>
  </form>;
}
