import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next');
  const safeNext = next?.startsWith('/') && !next.startsWith('//') ? next : '/';

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
  }
  const failurePath = safeNext.startsWith('/login')
    ? '/login?error=Verifikasi%20email%20gagal%20atau%20tautan%20sudah%20kedaluwarsa.'
    : '/forgot-password?error=Tautan%20reset%20tidak%20valid%20atau%20sudah%20kedaluwarsa.';
  return NextResponse.redirect(new URL(failurePath, url.origin));
}
