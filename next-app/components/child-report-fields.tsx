type ChildIdentity = {
  mother_nik?: string | null; father_name?: string | null; father_nik?: string | null;
  phone_number?: string | null; gestational_age_weeks?: number | null;
};

export function ChildReportIdentityFields({ child, group }: { child?: ChildIdentity; group: 'bayi' | 'balita' }) {
  return <>
    <label className="balita-modal-field"><span className="balita-modal-label">NIK ibu</span><input name="motherNik" inputMode="numeric" pattern="[0-9]{16}" maxLength={16} defaultValue={child?.mother_nik ?? ''} placeholder="16 digit NIK" /></label>
    <label className="balita-modal-field"><span className="balita-modal-label">Nama ayah</span><input name="fatherName" defaultValue={child?.father_name ?? ''} /></label>
    <label className="balita-modal-field"><span className="balita-modal-label">NIK ayah</span><input name="fatherNik" inputMode="numeric" pattern="[0-9]{16}" maxLength={16} defaultValue={child?.father_nik ?? ''} placeholder="16 digit NIK" /></label>
    <label className="balita-modal-field"><span className="balita-modal-label">No. HP orang tua</span><input name="phoneNumber" type="tel" defaultValue={child?.phone_number ?? ''} /></label>
    {group === 'bayi' && <label className="balita-modal-field"><span className="balita-modal-label">Usia kehamilan saat lahir (minggu)</span><input name="gestationalWeeks" type="number" step="0.1" min="0.1" defaultValue={child?.gestational_age_weeks ?? ''} /></label>}
  </>;
}

export function ChildReportMeasurementFields({ group }: { group: 'bayi' | 'balita' }) {
  return group === 'balita' ? <>
    <label className="balita-modal-field"><span className="balita-modal-label">Lingkar kepala (cm)</span><input name="headCircumferenceCm" type="number" step="0.01" min="0.01" /></label>
    <label className="balita-modal-field"><span className="balita-modal-label">LiLA jika diukur (cm)</span><input name="lilaCm" type="number" step="0.01" min="0.01" /></label>
  </> : null;
}
