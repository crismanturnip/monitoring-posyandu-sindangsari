'use client';

import { useState } from 'react';
import { reportDateRange, reportPeriodLabels, type ReportPeriod } from '@/lib/report-periods';
import type { ReportFilters } from '@/lib/reports';

export function ReportFiltersForm({ filters, posyandu }: {
  filters: ReportFilters;
  posyandu: { id: string; name: string }[];
}) {
  const [period, setPeriod] = useState(filters.period);
  const [startDate, setStartDate] = useState(filters.startDate);
  const [endDate, setEndDate] = useState(filters.endDate);

  const changePeriod = (value: ReportPeriod) => {
    setPeriod(value);
    if (value !== 'custom') {
      const dates = reportDateRange(value, endDate || filters.endDate);
      setStartDate(dates.startDate);
      setEndDate(dates.endDate);
    }
  };

  return <form className="report-filters" method="get" action="/laporan">
    <label>Kategori<select name="category" defaultValue={filters.category}><option value="semua">Semua</option><option value="balita">Bayi &amp; Balita</option><option value="ibu-hamil">Ibu Hamil</option><option value="lansia">Lansia</option></select></label>
    <label>Posyandu<select name="posyandu" defaultValue={filters.posyanduId}><option value="">Semua Posyandu yang dapat diakses</option>{posyandu.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Rentang laporan<select name="period" value={period} onChange={(event) => changePeriod(event.target.value as ReportPeriod)}>{Object.entries(reportPeriodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label>Tanggal pemeriksaan awal<input name="start" type="date" value={startDate} max={endDate || undefined} onChange={(event) => { setStartDate(event.target.value); setPeriod('custom'); }} required /></label>
    <label>Tanggal pemeriksaan akhir<input name="end" type="date" value={endDate} min={startDate || undefined} onChange={(event) => { setEndDate(event.target.value); setPeriod('custom'); }} required /></label>
    <button type="submit">Tampilkan</button>
  </form>;
}
