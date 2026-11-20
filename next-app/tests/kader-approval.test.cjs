const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

const actionPath = path.resolve(__dirname, '../app/(protected)/admin/kader/actions.ts');
const pagePath = path.resolve(__dirname, '../app/(protected)/admin/kader/page.tsx');
const invalidated = [];
let currentSupabase;
let status;
let confirmedAt;

const actionModule = new Module(actionPath, module);
actionModule.filename = actionPath;
actionModule.paths = Module._nodeModulePaths(path.dirname(actionPath));
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@/lib/auth') return { requireBidan: async () => ({ supabase: currentSupabase }) };

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
const { approveKader } = actionModule.exports;

function setup({ accountStatus = 'PENDING', emailConfirmedAt = null, confirmationError = null, transfer = false } = {}) {
  const calls = [];
  status = accountStatus;
  confirmedAt = emailConfirmedAt;
  currentSupabase = {
    auth: { getSession: async () => ({ data: { session: { access_token: 'bidansession' } }, error: null }) },
    functions: { invoke: async (name, options) => {
      calls.push({ type: 'confirm', name, options });
      return { error: confirmationError };
    } },
    from(table) {
      assert.equal(table, 'profiles');
      return {
        select(columns) {
          assert.equal(columns, 'role, account_status, email_confirmed_at');
          return {
            eq(column, id) {
              assert.equal(column, 'id');
              assert.equal(id, 'kader-1');
              return {
                maybeSingle: async () => ({ data: { role: 'KADER', account_status: status, email_confirmed_at: confirmedAt }, error: null }),
              };
            },
          };
        },
      };
    },
    async rpc(name, args) {
      calls.push({ type: 'rpc', name, args });
      return { error: null };
    },
  };

  invalidated.length = 0;
  const form = new FormData();
  form.set('kaderId', 'kader-1');
  form.set('posyanduId', 'posyandu-1');
  if (transfer) form.set('transferRequest', 'transfer-1');
  return { calls, form };
}

test('persetujuan kader pending mengonfirmasi email lebih dulu lalu menetapkan kader', async () => {
  const { calls, form } = setup();
  await approveKader(form);
  assert.deepEqual(calls, [
    { type: 'confirm', name: 'confirm-kader-email', options: { body: { kaderId: 'kader-1' }, headers: { Authorization: 'Bearer bidansession' } } },
    { type: 'rpc', name: 'assign_kader', args: { target_kader: 'kader-1', target_posyandu: 'posyandu-1', transfer_request: null } },
  ]);
  assert.deepEqual(invalidated, ['/admin/kader', '/akun']);
});

test('akun yang sudah terverifikasi tidak memanggil Edge Function konfirmasi', async () => {
  const { calls, form } = setup({ emailConfirmedAt: '2026-11-20T00:00:00Z' });
  await approveKader(form);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, 'rpc');
});

test('kader aktif yang penugasannya diubah tidak dikonfirmasi ulang', async () => {
  const { calls, form } = setup({ accountStatus: 'ACTIVE', emailConfirmedAt: null });
  await approveKader(form);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, 'rpc');
});

test('permintaan pindah tidak memakai alur konfirmasi email akun baru', async () => {
  const { calls, form } = setup({ transfer: true });
  await approveKader(form);
  assert.deepEqual(calls, [{
    type: 'rpc',
    name: 'assign_kader',
    args: { target_kader: 'kader-1', target_posyandu: 'posyandu-1', transfer_request: 'transfer-1' },
  }]);
});

test('gagal mengonfirmasi email tidak melanjutkan persetujuan', async () => {
  const { calls, form } = setup({ confirmationError: { code: 'unexpected_failure', status: 500 } });
  await assert.rejects(() => approveKader(form), /Email kader gagal dikonfirmasi/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, 'confirm');
  assert.deepEqual(invalidated, []);
});

test('halaman persetujuan tidak lagi menahan tombol sampai email terverifikasi', () => {
  const page = readFileSync(pagePath, 'utf8');
  assert.match(page, /Email akan dikonfirmasi saat disetujui/);
  assert.doesNotMatch(page, /disabled=\{!item\.email_confirmed_at\}/);
});
