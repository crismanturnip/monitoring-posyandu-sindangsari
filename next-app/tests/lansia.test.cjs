const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const { test } = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { createClient } = require('@supabase/supabase-js');
const ts = require('typescript');

const posyanduId = '11111111-1111-4111-8111-111111111111';
const people = [
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Nama Lansia Contoh',
    posyandu_id: posyanduId,
    posyandu: { name: 'Posyandu Melati' },
    elderly_examinations: [{
      id: '33333333-3333-4333-8333-333333333333',
      examined_at: '2026-11-14',
      created_at: '2026-11-14T01:00:00Z',
      officer_notes: 'Catatan pemeriksaan tersimpan.\n<contoh teks>',
    }],
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Lansia Tanpa Pemeriksaan',
    posyandu_id: posyanduId,
    posyandu: { name: 'Posyandu Melati' },
    elderly_examinations: [],
  },
];

async function renderPage(params = {}, options = {}) {
  const requests = [];
  const client = createClient('https://example.supabase.co', 'public-test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input, init = {}) => {
        const url = new URL(String(input));
        const table = url.pathname.split('/').at(-1);
        const method = init.method ?? 'GET';
        requests.push({ table, method, url });
        if ((table === 'elderly_people' && options.peopleError) ||
            (table === 'elderly_examinations' && options.countError)) {
          return new Response(JSON.stringify({ message: 'Test query failed', code: 'XX000' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        const data = table === 'elderly_people' ? options.people ?? people
          : table === 'posyandu' ? [{ id: posyanduId, name: 'Posyandu Melati' }] : [];
        const count = table === 'elderly_examinations' ? options.examinationCount ?? 7 : data.length;
        return new Response(method === 'HEAD' ? null : JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Range': `0-${Math.max(0, count - 1)}/${count}`,
          },
        });
      },
    },
  });

  const filename = path.resolve(__dirname, '../app/(protected)/lansia/page.tsx');
  const pageModule = new Module(filename, module);
  pageModule.filename = filename;
  pageModule.paths = Module._nodeModulePaths(path.dirname(filename));
  const mocks = {
    'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
    './actions': {},
    '@/lib/auth': { requireActiveProfile: async () => ({
      profile: { full_name: 'Pengguna Contoh', role: options.role ?? 'BIDAN' },
      supabase: client,
    }) },
    '@/components/page-hero': { PageHero: ({ pageTitle }) => React.createElement('h1', null, pageTitle) },
    '@/components/modal': { Modal: ({ children }) => children },
  };
  pageModule.require = (name) => mocks[name] ?? Module.prototype.require.call(pageModule, name);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  pageModule._compile(outputText, filename);
  const page = await pageModule.exports.default({ searchParams: Promise.resolve(params) });
  return { html: renderToStaticMarkup(page), requests };
}

test('lansia displays stored notes and dates without invented health or guardian information', async () => {
  const { html } = await renderPage();
  assert(html.includes('Nama Lansia Contoh'));
  assert.match(html, /datetime="2026-11-14"/i);
  assert(html.includes('Catatan pemeriksaan tersimpan.\n&lt;contoh teks&gt;'));
  assert(html.includes('Belum ada pemeriksaan'));
  assert(html.includes('Belum dicatat'));
  assert(html.includes('Belum dinilai'));
  assert(html.includes('CATATAN PEMERIKSAAN'));
  assert(html.includes('class="stitch-stat-value">7</div>'));
  for (const invented of ['Pendampingan (B)', 'Mandiri (A)', 'Sehat Terkontrol', 'Hipertensi', 'TD:', 'GDS:', 'LNS-', 'Hubungan:']) {
    assert(!html.includes(invented), `Invented information must not be displayed: ${invented}`);
  }
});

test('latest examination is limited per person while search, Posyandu, and pagination stay aligned', async () => {
  const { requests } = await renderPage({ q: 'Nama', posyandu: posyanduId, page: '3' });
  const list = requests.find((r) => r.table === 'elderly_people');
  const count = requests.find((r) => r.table === 'elderly_examinations');
  assert.equal(list.url.searchParams.get('elderly_examinations.limit'), '1');
  assert.equal(list.url.searchParams.get('elderly_examinations.order'), 'examined_at.desc,created_at.desc,id.desc');
  assert.equal(list.url.searchParams.get('offset'), '20');
  assert.equal(list.url.searchParams.get('limit'), '10');
  assert.equal(list.url.searchParams.get('name'), 'ilike.%Nama%');
  assert.equal(list.url.searchParams.get('posyandu_id'), `eq.${posyanduId}`);
  assert.equal(list.url.searchParams.get('deleted_at'), 'is.null');
  assert.equal(count.method, 'HEAD');
  assert.equal(count.url.searchParams.get('elderly_people.name'), 'ilike.%Nama%');
  assert.equal(count.url.searchParams.get('elderly_people.posyandu_id'), `eq.${posyanduId}`);
  assert.equal(count.url.searchParams.get('elderly_people.deleted_at'), 'is.null');
});

test('empty results show zero records without a fabricated risk count', async () => {
  const { html } = await renderPage({}, { people: [], examinationCount: 0 });
  assert.equal((html.match(/class="stitch-stat-value">0<\/div>/g) ?? []).length, 2);
  assert(html.includes('Belum ada data lansia yang cocok'));
});

test('failed queries display errors instead of pretending the data is empty', async () => {
  const { html } = await renderPage({}, { peopleError: true, countError: true });
  assert(html.includes('role="alert"'));
  assert(html.includes('Data lansia dan pemeriksaan terakhir gagal dimuat'));
  assert(html.includes('Jumlah catatan pemeriksaan belum dapat dimuat'));
  assert(html.includes('Daftar lansia belum dapat ditampilkan'));
  assert(html.includes('class="stitch-stat-value">-</div>'));
  assert(!html.includes('Belum ada data lansia yang cocok'));
});

test('kader retains access to examination history without management actions', async () => {
  const { html } = await renderPage({}, { role: 'KADER' });
  assert(html.includes(`/lansia/${people[0].id}`));
  assert(html.includes('Catatan pemeriksaan tersimpan'));
  assert(!html.includes('Tambah Data Lansia'));
  assert(!html.includes('aria-label="Ubah '));
  assert(!html.includes('aria-label="Hapus '));
});
