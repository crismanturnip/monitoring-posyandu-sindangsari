import { execSync } from 'node:child_process';

// Use the linked Supabase CLI session. Anon keys cannot read these RLS tables.
const required = {
  children: ['nik', 'mother_nik', 'father_name', 'father_nik', 'phone_number', 'gestational_age_weeks'],
  child_measurements: ['head_circumference_cm', 'lila_cm'],
  pregnant_mothers: ['nik', 'birth_date', 'husband_name', 'husband_nik', 'phone_number', 'gestational_age_weeks'],
};
const sql = "select table_name, column_name from information_schema.columns where table_schema = 'public' and table_name in ('children','child_measurements','pregnant_mothers')";

try {
  const output = execSync(`npx --yes supabase db query --remote --read-only "${sql}"`, { encoding: 'utf8' });
  const json = output.slice(output.indexOf('{'));
  const response = JSON.parse(json);
  const available = new Set(response.rows.map(row => `${row.table_name}.${row.column_name}`));
  for (const [table, columns] of Object.entries(required)) {
    const missing = columns.filter(column => !available.has(`${table}.${column}`));
    if (missing.length) {
      console.error(`${table}: kolom belum tersedia: ${missing.join(', ')}`);
      process.exitCode = 1;
    } else {
      console.log(`${table}: kolom laporan tersedia`);
    }
  }
  if (process.exitCode) console.error('Terapkan migrasi Supabase sebelum merilis formulir baru.');
} catch (error) {
  console.error('Pemeriksaan skema gagal. Pastikan Supabase CLI sudah login dan proyek tertaut.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
