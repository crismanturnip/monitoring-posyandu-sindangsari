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
