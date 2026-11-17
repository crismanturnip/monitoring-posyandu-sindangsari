import { reportAgeParts } from './report-age';

export function childRegisterGroup(birthDate: string, today: string): 'bayi' | 'balita' | null {
  const age = reportAgeParts(birthDate, today);
  if (!age) return null;
  return age.months < 12 ? 'bayi' : 'balita';
}
