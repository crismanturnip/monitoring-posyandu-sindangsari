import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash');
  const expiredUrl = new URL('/forgot-password', url.origin);
  expiredUrl.searchParams.set('error', 'Tautan reset tidak valid atau sudah kedaluwarsa.');

  if (!tokenHash) return NextResponse.redirect(expiredUrl);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'recovery',
  });

  if (error) return NextResponse.redirect(expiredUrl);

  const response = NextResponse.redirect(new URL('/update-password', url.origin));
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
