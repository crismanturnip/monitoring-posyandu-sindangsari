// The current schema stores adult examination results in officer_notes.
// Preserve the submitted results there without deriving a diagnosis or filling defaults.
type Field = { name: string; label: string; unit?: string; numeric?: boolean };

const motherFields: Field[] = [
  { name: 'weight', label: 'BB', unit: 'kg', numeric: true },
  { name: 'height', label: 'TB', unit: 'cm', numeric: true },
  { name: 'bloodPressure', label: 'TD', unit: 'mmHg' },
  { name: 'lila', label: 'LiLA', unit: 'cm', numeric: true },
];
const elderlyFields: Field[] = [
  { name: 'bloodPressure', label: 'TD', unit: 'mmHg' },
  { name: 'bloodSugar', label: 'GDS', unit: 'mg/dL', numeric: true },
  { name: 'cholesterol', label: 'Kolesterol', unit: 'mg/dL', numeric: true },
  { name: 'uricAcid', label: 'Asam urat', unit: 'mg/dL', numeric: true },
  { name: 'weight', label: 'BB', unit: 'kg', numeric: true },
  { name: 'height', label: 'TB', unit: 'cm', numeric: true },
  { name: 'aks', label: 'Kemandirian' },
  { name: 'healthRisk', label: 'Status kesehatan' },
];

export function examinationNotes(formData: FormData, category: 'ibu-hamil' | 'lansia') {
  const fields = category === 'ibu-hamil' ? motherFields : elderlyFields;
  const parts: string[] = [];
  for (const field of fields) {
    let value = String(formData.get(field.name) ?? '').trim();
    if (!value) continue;
    if (field.numeric) {
      value = value.replace(',', '.');
      if (!Number.isFinite(Number(value)) || Number(value) <= 0) {
        throw new Error(`${field.label} harus berupa angka lebih besar dari 0.`);
      }
    }
    parts.push(`${field.label}: ${value}${field.unit ? ` ${field.unit}` : ''}`);
  }
  const notes = String(formData.get('notes') ?? '').trim();
  if (notes) parts.push(notes);
  return parts.join('\n') || null;
}

export function parseMotherExaminationNotes(value: string | null) {
  const parsed = { weight: '', height: '', bloodPressure: '', lila: '', notes: [] as string[] };
  for (const line of (value ?? '').split('\n')) {
    const match = /^(BB|TB|TD|LiLA): (.+?)(?: (kg|cm|mmHg))?$/.exec(line);
    if (!match) { if (line) parsed.notes.push(line); continue; }
    const key = ({ BB: 'weight', TB: 'height', TD: 'bloodPressure', LiLA: 'lila' } as const)[match[1] as 'BB' | 'TB' | 'TD' | 'LiLA'];
    parsed[key] = match[2];
  }
  return { ...parsed, notes: parsed.notes.join('\n') };
}
