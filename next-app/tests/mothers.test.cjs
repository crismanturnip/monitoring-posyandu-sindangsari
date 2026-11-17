const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const { test } = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { createClient } = require('@supabase/supabase-js');
const ts = require('typescript');

async function renderPage(params = {}, options = {}) {
  const requests = [];
  const people = options.empty ? [] : [{
    id: '22222222-2222-4222-8222-222222222222', name: 'Ibu pengujian',
    posyandu_id: '11111111-1111-4111-8111-111111111111', posyandu: { name: 'Posyandu pengujian' },
    pregnancy_visits: [{ id: 'visit-1', visited_at: '2026-11-17', officer_notes: 'BB: 53 kg\nLiLA: 24.5 cm', created_at: '2026-11-17T01:00:00Z' }],
  }];
  const supabase = createClient('https://example.supabase.co', 'test-public-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input) => {
      const url = new URL(String(input)); requests.push(url);
      const data = url.pathname.endsWith('/posyandu')
        ? [{ id: '11111111-1111-4111-8111-111111111111', name: 'Posyandu pengujian' }] : people;
      return new Response(JSON.stringify(data), { headers: {
        'Content-Type': 'application/json', 'Content-Range': `0-${Math.max(0, data.length - 1)}/${data.length}`,
      } });
    } },
  });
  const filename = path.resolve(__dirname, '../app/(protected)/ibu-hamil/page.tsx');
  const pageModule = new Module(filename, module);
  pageModule.filename = filename;
  pageModule.paths = Module._nodeModulePaths(path.dirname(filename));
  const mocks = {
    'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
    './actions': { createPregnantMother: async () => {}, updatePregnantMother: async () => {} },
    '@/lib/auth': { requireActiveProfile: async () => ({
      profile: { full_name: 'Petugas pengujian', role: options.role ?? 'BIDAN' }, supabase,
    }) },
    '@/components/page-hero': { PageHero: ({ pageTitle }) => React.createElement('h1', null, pageTitle) },
    '@/components/modal': { Modal: ({ children }) => children },
    '@/lib/health-record-dates': { jakartaDate: () => '2026-11-17' },
    '@/lib/report-age': { reportAge: () => '28 tahun' },
  };
  pageModule.require = name => mocks[name] ?? Module.prototype.require.call(pageModule, name);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  pageModule._compile(outputText, filename);
  return { html: renderToStaticMarkup(await pageModule.exports.default({ searchParams: Promise.resolve(params) })), requests };
}

test('mother listing shows stored examination notes instead of generated health results', async () => {
  const { html, requests } = await renderPage();
  assert(html.includes('BB: 53 kg\nLiLA: 24.5 cm'));
  assert(html.includes('Belum dinilai'));
  assert(!html.includes('Gizi Normal &amp; Sehat'));
  assert(!html.includes('Tn. Hendra Gunawan'));
  assert(!html.includes('BB: 58 kg'));
  const query = requests.find(url => url.pathname.endsWith('/pregnant_mothers'));
  assert.equal(query.searchParams.get('pregnancy_visits.limit'), '1');
  assert.equal(query.searchParams.get('pregnancy_visits.order'), 'visited_at.desc,created_at.desc,id.desc');
});

test('mother registration starts with blank clinical results and an explicit examination date', async () => {
  const { html } = await renderPage({ tambah: '1' });
  for (const name of ['weight', 'height', 'lila']) {
    const input = html.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`));
    assert(input, name);
    assert(!/value="[^\"]+"/.test(input[0]), `${name} contains a fabricated result`);
  }
  assert.match(html, /name="visitedAt"[^>]*value="2026-11-17"/);
});

test('empty mother lists and kader access do not invent clinical results or expose management controls', async () => {
  const empty = await renderPage({}, { empty: true });
  assert(empty.html.includes('Belum ada data ibu hamil'));
  const kader = await renderPage({ tambah: '1' }, { role: 'KADER' });
  assert(kader.html.includes('BB: 53 kg'));
  assert(!kader.html.includes('Tambah Data Ibu Hamil'));
  assert(!kader.html.includes('name="visitedAt"'));
});
