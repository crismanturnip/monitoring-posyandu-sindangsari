import { isValidRecordDate } from './health-record-dates';

export function reportAgeParts(birthDate?: string, recordedAt?: string) {
  if (!birthDate || !recordedAt || !isValidRecordDate(birthDate) || !isValidRecordDate(recordedAt) || birthDate > recordedAt) return null;
  const birth = new Date(`${birthDate}T00:00:00Z`);
  const at = new Date(`${recordedAt}T00:00:00Z`);
  let months = (at.getUTCFullYear() - birth.getUTCFullYear()) * 12 + at.getUTCMonth() - birth.getUTCMonth();
  const anniversary = (offset: number) => {
    const date = new Date(Date.UTC(birth.getUTCFullYear(), birth.getUTCMonth() + offset, 1));
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(birth.getUTCDate(), lastDay));
    return date;
  };
  if (anniversary(months) > at) months -= 1;
  const days = Math.round((at.getTime() - anniversary(months).getTime()) / 86_400_000);
  return { months, days };
}

export function reportAge(birthDate?: string, recordedAt?: string, child = true) {
  const age = reportAgeParts(birthDate, recordedAt);
  if (!age) return '—';
  if (child && age.months === 0) return age.days === 0 ? '0 hari (baru lahir)' : `${age.days} hari`;
  if (child && age.months < 12) return `${age.months} bulan${age.days ? ` ${age.days} hari` : ''}`;
  const years = Math.floor(age.months / 12);
  const months = age.months % 12;
  return `${years} tahun${months ? ` ${months} bulan` : ''}`;
}
