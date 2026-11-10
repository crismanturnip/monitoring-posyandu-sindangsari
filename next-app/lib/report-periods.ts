export const reportPeriodLabels = {
  '1-hari': '1 hari',
  '1-minggu': '1 minggu',
  '1-bulan': '1 bulan',
  '3-bulan': '3 bulan',
  custom: 'Tanggal sendiri',
} as const;

export type ReportPeriod = keyof typeof reportPeriodLabels;

export function reportDateRange(period: Exclude<ReportPeriod, 'custom'>, endDate: string) {
  const end = new Date(`${endDate}T00:00:00Z`);
  const start = new Date(end);
  if (period === '1-minggu') {
    start.setUTCDate(start.getUTCDate() - 6);
  } else if (period === '1-bulan' || period === '3-bulan') {
    const day = start.getUTCDate();
    start.setUTCDate(1);
    start.setUTCMonth(start.getUTCMonth() - (period === '1-bulan' ? 1 : 3));
    const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
    start.setUTCDate(Math.min(day, lastDay) + 1);
  }
  return { startDate: start.toISOString().slice(0, 10), endDate };
}
