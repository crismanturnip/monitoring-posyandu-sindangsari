'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (configured) return configured;
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  if (!host) throw new Error('Alamat aplikasi belum dikonfigurasi.');
  const protocol = requestHeaders.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
}

function authErrorPath(path: string, message: string) {
  return `${path}?error=${encodeURIComponent(message)}`;
}

export async function signIn(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) redirect(authErrorPath('/login', 'Email dan kata sandi wajib diisi.'));

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) redirect(authErrorPath('/login', 'Email atau kata sandi tidak valid.'));
  // Account status is checked by proxy.ts on the following request. Querying
  // immediately after sign-in can observe the pre-session token in an SSR action.
  redirect('/dashboard');
}

export async function signUp(formData: FormData) {
  const fullName = String(formData.get('fullName') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const requestedPosyanduId = String(formData.get('requestedPosyanduId') ?? '');
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');
  if (fullName.length < 2 || !email || !requestedPosyanduId || password.length < 8 || password !== confirmPassword) {
    redirect(authErrorPath('/register', 'Periksa nama, email, pilihan Posyandu, dan kata sandi minimal 8 karakter yang harus sama.'));
  }

  const supabase = await createSupabaseServerClient();
  const { data: available, error: listError } = await supabase.rpc('registration_posyandu');
  if (listError || !available?.some((item: { id: string }) => item.id === requestedPosyanduId)) {
    redirect(authErrorPath('/register', 'Posyandu yang dipilih tidak tersedia. Pilih Posyandu aktif.'));
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, requested_posyandu_id: requestedPosyanduId },
      emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/login?verified=1`,
    },
  });
  if (error || !data.user) {
    if (error) console.error('signup_failed', { code: error.code, status: error.status });
    redirect(authErrorPath('/register', 'Registrasi belum berhasil. Periksa alamat email dan coba lagi.'));
  }
  redirect('/login?registered=1');
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: 'local' });
  redirect('/login');
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) redirect(authErrorPath('/forgot-password', 'Email wajib diisi.'));

  const origin = await siteOrigin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  });

  if (error) {
    console.error('password_reset_failed', { code: error.code, status: error.status });
    redirect(authErrorPath('/forgot-password', 'Tautan reset belum dapat dikirim. Coba beberapa saat lagi.'));
  }
  redirect('/forgot-password?sent=1');
}

export async function updateRecoveredPassword(formData: FormData) {
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');
  if (password.length < 8 || password !== confirmPassword) {
    redirect(authErrorPath('/update-password', 'Kata sandi minimal 8 karakter dan konfirmasi harus sama.'));
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(authErrorPath('/forgot-password', 'Tautan reset tidak valid atau sudah kedaluwarsa.'));
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(authErrorPath('/update-password', 'Kata sandi belum dapat diperbarui. Silakan minta tautan baru.'));
  await supabase.auth.signOut({ scope: 'local' });
  redirect('/login?password_updated=1');
}

export async function changePassword(formData: FormData) {
  const currentPassword = String(formData.get('currentPassword') ?? '');
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');
  if (!currentPassword || password.length < 8 || password !== confirmPassword) {
    redirect(authErrorPath('/akun', 'Isi kata sandi saat ini, kata sandi baru minimal 8 karakter, dan konfirmasi yang sama.'));
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { error } = await supabase.auth.updateUser({ password, current_password: currentPassword });
  if (error) redirect(authErrorPath('/akun', 'Kata sandi belum dapat diperbarui.'));
  redirect('/akun?success=Kata%20sandi%20berhasil%20diperbarui.');
}
