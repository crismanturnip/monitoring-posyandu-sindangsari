import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Unauthorized.' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('confirm_kader_email_missing_supabase_config');
    return json({ error: 'Konfigurasi Supabase Function belum lengkap.' }, 500);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: 'Unauthorized.' }, 401);

  const { data: caller, error: callerError } = await userClient.rpc('get_current_profile').single();
  if (callerError || caller?.role !== 'BIDAN' || caller?.account_status !== 'ACTIVE') {
    return json({ error: 'Hanya Bidan aktif yang dapat menyetujui kader.' }, 403);
  }

  let body: { kaderId?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Permintaan tidak valid.' }, 400);
  }

  const kaderId = typeof body.kaderId === 'string' ? body.kaderId : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(kaderId)) {
    return json({ error: 'ID kader tidak valid.' }, 400);
  }

  const { data: kader, error: kaderError } = await userClient
    .from('profiles')
    .select('id, role, account_status, email_confirmed_at')
    .eq('id', kaderId)
    .maybeSingle();
  if (kaderError) return json({ error: 'Status kader gagal diperiksa.' }, 500);
  if (!kader || kader.role !== 'KADER') return json({ error: 'Akun kader tidak ditemukan.' }, 404);
  if (kader.account_status !== 'PENDING') return json({ error: 'Akun kader tidak lagi menunggu persetujuan.' }, 409);
  if (kader.email_confirmed_at) return json({ confirmed: true });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error: confirmationError } = await adminClient.auth.admin.updateUserById(kaderId, { email_confirm: true });
  if (confirmationError) {
    console.error('confirm_kader_email_admin_update_failed', { code: confirmationError.code, status: confirmationError.status });
    return json({ error: 'Email kader gagal dikonfirmasi oleh sistem.' }, 502);
  }

  return json({ confirmed: true });
});
