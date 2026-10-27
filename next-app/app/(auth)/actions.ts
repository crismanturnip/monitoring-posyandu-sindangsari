'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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
  redirect('/');
}

export async function signUp(formData: FormData) {
  const fullName = String(formData.get('fullName') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');
  if (fullName.length < 2 || !email || password.length < 8 || password !== confirmPassword) {
    redirect(authErrorPath('/register', 'Periksa nama, email, serta kata sandi minimal 8 karakter yang harus sama.'));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) redirect(authErrorPath('/register', 'Registrasi belum berhasil. Pastikan email belum digunakan.'));
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

  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const protocol = requestHeaders.get('x-forwarded-proto') ?? (host?.includes('localhost') ? 'http' : 'https');
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? `${protocol}://${host}`;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  });

  if (error) redirect(authErrorPath('/forgot-password', 'Tautan reset belum dapat dikirim. Coba beberapa saat lagi.'));
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
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');
  if (password.length < 8 || password !== confirmPassword) {
    redirect(authErrorPath('/akun', 'Kata sandi minimal 8 karakter dan konfirmasi harus sama.'));
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(authErrorPath('/akun', 'Kata sandi belum dapat diperbarui.'));
  redirect('/akun?success=Kata%20sandi%20berhasil%20diperbarui.');
}
