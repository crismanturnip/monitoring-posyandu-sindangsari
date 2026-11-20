const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

const actionPath = path.resolve(__dirname, '../app/(protected)/admin/kader/actions.ts');
const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261120050938_permanent_kader_deletion.sql');
const invalidated = [];
let currentClient;

const actionModule = new Module(actionPath, module);
actionModule.filename = actionPath;
actionModule.paths = Module._nodeModulePaths(path.dirname(actionPath));
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@/lib/auth') return { requireBidan: async () => ({ supabase: currentClient }) };
  if (request === '@/lib/supabase/admin') return { createSupabaseAdminClient: () => { throw new Error('Admin client is not used by this test.'); } };
  if (request === 'next/cache') return { revalidatePath: (route) => invalidated.push(route) };
  return originalLoad.call(this, request, parent, isMain);
};
try {
  const { outputText } = ts.transpileModule(readFileSync(actionPath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: actionPath,
  });
  actionModule._compile(outputText, actionPath);
} finally {
  Module._load = originalLoad;
}
const { deleteKaderAccount } = actionModule.exports;
const kaderId = 'c39e7789-0134-4cb4-9a76-fcb6eaaebc22';

function setupRpc(result) {
  const calls = [];
  currentClient = {
    async rpc(name, args) {
      calls.push({ name, args });
      return result;
    },
  };
  invalidated.length = 0;
  return calls;
}

function formFor(id = kaderId) {
  const form = new FormData();
  form.set('kaderId', id);
  return form;
}

test('akun kader berhasil dihapus melalui RPC atomik dan halaman diperbarui', async () => {
  const calls = setupRpc({ error: null });
  const state = await deleteKaderAccount({ error: null, success: null }, formFor());
  assert.deepEqual(calls, [{ name: 'delete_kader_account', args: { target_kader: kaderId } }]);
  assert.deepEqual(state, { error: null, success: 'Akun kader berhasil dihapus permanen.' });
  assert.deepEqual(invalidated, ['/admin/kader', '/akun']);
});

test('riwayat yang dilindungi membatalkan penghapusan dan pesannya ditampilkan', async () => {
  const calls = setupRpc({
    error: {
      code: 'P0001',
      message: 'Akun tidak dihapus karena masih tercatat pada: riwayat pemeriksaan kesehatan, catatan audit. Riwayat tersebut dipertahankan; tidak ada perubahan yang disimpan.',
    },
  });
  const state = await deleteKaderAccount({ error: null, success: null }, formFor());
  assert.equal(calls.length, 1);
  assert.match(state.error, /riwayat pemeriksaan kesehatan, catatan audit/);
  assert.equal(state.success, null);
  assert.deepEqual(invalidated, []);
});

test('ID tidak valid ditolak tanpa memanggil RPC', async () => {
  const calls = setupRpc({ error: null });
  const state = await deleteKaderAccount({ error: null, success: null }, formFor('not-a-uuid'));
  assert.deepEqual(state, { error: 'Akun kader tidak valid.', success: null });
  assert.deepEqual(calls, []);
  assert.deepEqual(invalidated, []);
});

test('migrasi membatasi Bidan, mempertahankan riwayat, dan menghapus keanggotaan serta akun Auth', () => {
  const migration = readFileSync(migrationPath, 'utf8');
  assert.match(migration, /not public\.is_bidan\(\)/);
  assert.match(migration, /child_measurements where recorded_by = target_kader/);
  assert.match(migration, /pregnancy_visits where recorded_by = target_kader/);
  assert.match(migration, /elderly_examinations where recorded_by = target_kader/);
  assert.match(migration, /activity_logs where actor_id = target_kader/);
  assert.match(migration, /schedules where created_by = target_kader/);
  assert.match(migration, /delete from public\.kader_assignments where kader_id = target_kader/);
  assert.match(migration, /delete from public\.kader_transfer_requests where kader_id = target_kader/);
  assert.match(migration, /delete from public\.profiles where id = target_kader/);
  assert.match(migration, /delete from auth\.users where id = target_kader/);
});
