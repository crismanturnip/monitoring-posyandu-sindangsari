export function optionalText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim() || null;
}

export function optionalNik(formData: FormData, key: string) {
  const value = optionalText(formData, key);
  if (value && !/^\d{16}$/.test(value)) throw new Error('NIK harus terdiri dari 16 digit angka.');
  return value;
}

export function optionalPositiveNumber(formData: FormData, key: string) {
  const value = optionalText(formData, key);
  if (!value) return null;
  const number = Number(value.replace(',', '.'));
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${key} harus berupa angka lebih besar dari 0.`);
  return number;
}
