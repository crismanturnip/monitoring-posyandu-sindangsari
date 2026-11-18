const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

const actionPath = path.resolve(__dirname, '../app/(protected)/admin/posyandu/actions.ts');
const invalidated = [];
let currentClient;

const actionModule = new Module(actionPath, module);
actionModule.filename = actionPath;
actionModule.paths = Module._nodeModulePaths(path.dirname(actionPath));
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@/lib/auth') return { requireBidan: async () => ({ supabase: currentClient }) };
  if (request === 'next/cache') return { revalidatePath: (route) => invalidated.push(route) };
  if (request === 'next/navigation') return {
    redirect: (destination) => { throw Object.assign(new Error('redirect'), { destination }); },
  };
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
const { deletePosyandu } = actionModule.exports;

function fixture({ counts = {}, readError, deleteError, deletedRows = [{ id: 'pos-a' }] } = {}) {
  const calls = [];
  currentClient = {
    from(table) {
      if (table === 'posyandu') return {
        delete() {
          calls.push('delete');
          return { eq() { return { select: async () => ({ data: deletedRows, error: deleteError ?? null }) }; } };
        },
      };
      return {
        select(_columns, options) {
          assert.deepEqual(options, { count: 'exact', head: true });
          return { eq(column, id) {
            assert.equal(column, 'posyandu_id');
            assert.equal(id, 'pos-a');
            calls.push(table);
            return Promise.resolve({ count: counts[table] ?? 0, error: table === readError ? { message: 'query failed' } : null });
          } };
        },
      };
    },
  };
  invalidated.length = 0;
  return calls;
}

async function submit() {
  const form = new FormData();
  form.set('id', 'pos-a');
  await assert.rejects(() => deletePosyandu(form), (error) => {
    assert.equal(error.message, 'redirect');
    return true;
  });
}

test('posyandu dengan data dan riwayat kader tidak dihapus; pesan menyebut penghalang sebenarnya', async () => {
  const calls = fixture({ counts: { children: 2, kader_assignments: 1 } });
  const form = new FormData();
  form.set('id', 'pos-a');
  await assert.rejects(() => deletePosyandu(form), (error) => {
    const message = new URL(error.destination, 'http://localhost').searchParams.get('error');
    assert.match(message, /2 data bayi\/balita/);
    assert.match(message, /1 riwayat penugasan kader/);
    assert.doesNotMatch(message, /jadwal/);
    assert.match(message, /diarsipkan/);
    return true;
  });
  assert.equal(calls.includes('delete'), false);
});

test('posyandu kosong dapat dihapus dan halaman diperbarui', async () => {
  const calls = fixture();
  const form = new FormData();
  form.set('id', 'pos-a');
  await assert.rejects(() => deletePosyandu(form), (error) => {
    assert.match(error.destination, /success=/);
    return true;
  });
  assert.equal(calls.filter((call) => call === 'delete').length, 1);
  assert.deepEqual(invalidated, ['/admin/posyandu', '/']);
});

test('gagal menghitung keterkaitan membatalkan penghapusan', async () => {
  const calls = fixture({ readError: 'schedules' });
  await submit();
  assert.equal(calls.includes('delete'), false);
});

test('penolakan izin delete tidak ditampilkan sebagai sukses', async () => {
  const calls = fixture({ deleteError: { code: '42501', message: 'permission denied' } });
  const form = new FormData();
  form.set('id', 'pos-a');
  await assert.rejects(() => deletePosyandu(form), (error) => {
    assert.match(error.destination, /error=/);
    assert.doesNotMatch(error.destination, /success=/);
    assert.match(new URL(error.destination, 'http://localhost').searchParams.get('error'), /migrasi terbaru/);
    return true;
  });
  assert.equal(calls.includes('delete'), true);
  assert.deepEqual(invalidated, []);
});
