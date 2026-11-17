const assert = require('node:assert/strict');
const { readFileSync, writeFileSync, mkdirSync, existsSync } = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const { test } = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { createClient } = require('@supabase/supabase-js');
const ts = require('typescript');

const today = '2026-11-17';
const person = (id, birth_date) => ({
  id, name: `Anak contoh ${id}`, birth_date, gender: 'PEREMPUAN', mother_name: 'Ibu contoh',
  nik: '0012345678901234', posyandu_id: 'pos-a', posyandu: { name: 'Posyandu contoh' }, kms_status: 'GIZI_BAIK',
});

function fixture(options = {}) {
  const requests = [];
  const children = options.children ?? [person('baru-lahir', today), person('sebelum-setahun', '2025-11-18'), person('setahun', '2025-11-17')];
  const supabase = createClient('https://example.supabase.co', 'test-public-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async input => {
      const url = new URL(String(input));
      requests.push(url);
      const table = url.pathname.split('/').at(-1);
      if (options.failChildren && table === 'children') return new Response(JSON.stringify({ message: 'Data tidak tersedia' }), { status: 500 });
      let data = table === 'posyandu' ? [{ id: 'pos-a', name: 'Posyandu contoh' }]
        : table === 'children' ? children
        : table === 'pregnant_mothers' ? [{ id: 'ibu-contoh', name: 'Bunga contoh', posyandu_id: 'pos-a', posyandu: { name: 'Posyandu contoh' }, pregnancy_visits: [] }]
        : children.map(child => ({ child_id: child.id, measured_at: today, created_at: `${today}T01:00:00Z`, weight_kg: 4, height_cm: 54, officer_notes: null }));
      const total = data.length;
      const offset = Number(url.searchParams.get('offset') ?? 0);
      const limit = Math.min(Number(url.searchParams.get('limit') ?? total), table === 'children' ? options.apiLimit ?? 500 : total);
      data = data.slice(offset, offset + limit);
      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json', 'Content-Range': `${offset}-${offset + data.length - 1}/${total}` } });
    } },
  });
  const profile = { full_name: 'Petugas contoh', role: options.role ?? 'KADER' };
  const mocks = {
    'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
    'next/image': { __esModule: true, default: ({ priority, ...props }) => React.createElement('img', props) },
    'next/navigation': { usePathname: () => options.pathname ?? '/bayi' },
    '@/lib/auth': { requireActiveProfile: async () => ({ profile, supabase }) },
    '@/lib/health-record-dates': { jakartaDate: () => today },
  };
  const modules = new Map();
  function load(relative) {
    let filename = path.resolve(__dirname, '..', relative);
    if (!existsSync(filename)) filename += existsSync(filename + '.tsx') ? '.tsx' : '.ts';
    if (modules.has(filename)) return modules.get(filename).exports;
    const entry = new Module(filename, module);
    modules.set(filename, entry);
    entry.filename = filename;
    entry.paths = Module._nodeModulePaths(path.dirname(filename));
    entry.require = name => {
      if (mocks[name]) return mocks[name];
      if (name.endsWith('/actions') || name === './actions') return new Proxy({}, { get: () => async () => {} });
      if (name.startsWith('@/')) return load(name.slice(2));
      if (name.startsWith('.')) return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), name)));
      return Module.prototype.require.call(entry, name);
    };
    entry._compile(ts.transpileModule(readFileSync(filename, 'utf8'), {
      fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename);
    return entry.exports;
  }
  const reportLibrary = load('lib/reports.ts');
  mocks['@/lib/reports'] = { ...reportLibrary, loadReportRows: async (_client, filters) => ({
    rows: (options.reportRows ?? []).filter(row => filters.category === 'semua' || row.category === { bayi: 'Bayi', balita: 'Balita', 'ibu-hamil': 'Ibu Hamil', lansia: 'Lansia' }[filters.category]),
    error: null,
  }) };
  async function render(route, params = {}, frame = false) {
    let element = await load(`app/(protected)/${route}/page.tsx`).default({ searchParams: Promise.resolve(params) });
    while (element?.type?.constructor.name === 'AsyncFunction') element = await element.type(element.props);
    return renderToStaticMarkup(frame ? React.createElement(load('components/application-frame.tsx').ApplicationFrame, { profile }, element) : element);
  }
  return { render, requests, load };
}

test('baby and toddler registers change exactly on the first birthday, including leap-day births', () => {
  const { childRegisterGroup } = fixture().load('lib/child-register.ts');
  assert.equal(childRegisterGroup(today, today), 'bayi');
  assert.equal(childRegisterGroup('2025-11-18', today), 'bayi');
  assert.equal(childRegisterGroup('2025-11-17', today), 'balita');
  assert.equal(childRegisterGroup('2024-02-29', '2025-02-27'), 'bayi');
  assert.equal(childRegisterGroup('2024-02-29', '2025-02-28'), 'balita');
  assert.equal(childRegisterGroup('2026-11-18', today), null);
});

for (const role of ['KADER', 'BIDAN']) test(`${role} sees separate registers with independent columns and the right detail links`, async () => {
  const app = fixture({ role, apiLimit: 2 });
  const baby = await app.render('bayi');
  const toddler = await app.render('balita');
  assert(baby.includes('Anak contoh baru-lahir'));
  assert(baby.includes('Anak contoh sebelum-setahun'));
  assert(!baby.includes('Anak contoh setahun'));
  assert(baby.includes('0 hari (baru lahir)'));
  assert(baby.includes('href="/bayi/baru-lahir"'));
  assert(toddler.includes('Anak contoh setahun'));
  assert(!toddler.includes('Anak contoh sebelum-setahun'));
  for (const html of [baby, toddler]) {
    for (const heading of ['Jenis Kelamin', 'Umur', 'Nama Ibu', 'BB (kg)']) assert(html.includes(`>${heading}</th>`));
    assert(html.includes('tabIndex="0"') || html.includes('tabindex="0"'));
    assert.equal(html.includes('class="balita-action-btn delete"'), role === 'BIDAN');
  }
});

test('register pagination preserves search and category and loads past an API page limit', async () => {
  const app = fixture({ children: Array.from({ length: 12 }, (_, i) => person(`bayi-${i}`, '2026-11-01')), apiLimit: 5 });
  const html = await app.render('bayi', { q: 'contoh', page: '2' });
  assert(html.includes('Anak contoh bayi-11'));
  assert(!html.includes('Anak contoh bayi-0<'));
  assert(html.includes('/bayi?q=contoh&amp;posyandu=semua&amp;usia=semua&amp;page=1'));
  assert.equal(app.requests.filter(url => url.pathname.endsWith('/children')).length, 3);
  const empty = await app.render('bayi', { usia: '6-12' });
  assert(empty.includes('Belum ada data bayi'));
});

test('a failed child query reports failure rather than showing an empty register', async () => {
  await assert.rejects(fixture({ failChildren: true }).render('bayi'), /Gagal memuat data anak/);
});

test('report detail columns match the exports for both roles and mother names are plain text', async () => {
  const rows = ['Bayi', 'Balita', 'Ibu Hamil'].map((category, i) => ({
    id: `row-${i}`, category, date: today, name: `Nama contoh ${i}`, posyandu: 'Posyandu contoh',
    result: 'BB: 4 kg', notes: '', birthDate: category === 'Bayi' ? today : '2024-01-01', nik: '0012345678901234',
  }));
  for (const role of ['KADER', 'BIDAN']) {
    const app = fixture({ role, reportRows: rows });
    const html = await app.render('laporan', { category: 'semua', start: today, end: today, period: 'custom' });
    const tables = app.load('lib/report-tables.ts').reportTables(rows, { category: 'semua' });
    for (const table of tables) for (const column of table.columns) {
      const label = renderToStaticMarkup(React.createElement('th', null, column.label));
      assert(html.includes(label.replace('<th>', '<th scope="col">')), column.label);
    }
    assert(!html.includes('report-mobile-list'));
    const mother = await app.render('ibu-hamil');
    assert(mother.includes('Bunga contoh'));
    assert(!mother.includes('table-avatar-pill'));
    assert(!mother.includes('pill-posyandu'));
    assert(mother.includes('class="maternal-risk-value"'));
  }
});

test('all categories remain visible when the first ten report records are babies, with independent pagination', async () => {
  const row = (id, category) => ({ id, category, date: today, name: id, posyandu: 'Posyandu contoh', notes: '' });
  const rows = [
    ...Array.from({ length: 15 }, (_, i) => row(`Bayi contoh ${String(i).padStart(2, '0')}`, 'Bayi')),
    row('Balita tetap terlihat', 'Balita'), row('Ibu hamil tetap terlihat', 'Ibu Hamil'),
  ];
  for (const role of ['KADER', 'BIDAN']) {
    const app = fixture({ role, reportRows: rows });
    for (const params of [{}, { page_bayi: '2' }, { page_bayi: '999' }, { page_bayi: '-1' }]) {
      const html = await app.render('laporan', { category: 'semua', period: 'custom', start: today, end: today, posyandu: 'pos-a', ...params });
      assert(html.includes('Balita tetap terlihat'));
      assert(html.includes('Ibu hamil tetap terlihat'));
      assert(html.includes('Semua kategori'));
      assert(html.includes('page_bayi=2') || html.includes('page_bayi=1'));
      const downloads = [...html.matchAll(/href="([^\"]*\/api\/laporan\/[^\"]+)"/g)].map(match => match[1]);
      assert.equal(downloads.length, 2);
      assert(downloads.every(href => href.includes('category=semua') && href.includes('posyandu=pos-a') && !href.includes('page_')));
    }
    const onlyBabies = await fixture({ role, reportRows: rows.filter(row => row.category === 'Bayi') }).render('laporan');
    assert(onlyBabies.includes('aria-label="Laporan Balita"'));
    assert(onlyBabies.includes('aria-label="Laporan Ibu Hamil"'));
    assert(onlyBabies.includes('Tidak ada data untuk filter yang dipilih.'));
    const selected = await app.render('laporan', { category: 'ibu-hamil' });
    assert(selected.includes('Ibu hamil tetap terlihat'));
    assert(!selected.includes('Bayi contoh 00'));
    assert(!selected.includes('aria-label="Laporan Balita"'));
  }
});

if (process.env.WRITE_UI_PREVIEWS) test('write isolated browser previews with sample data', async () => {
  const directory = path.resolve('.next/register-ui-preview');
  mkdirSync(directory, { recursive: true });
  const reportRows = ['Bayi', 'Balita', 'Ibu Hamil'].map((category, i) => ({
    id: `row-${i}`, category, date: today, name: `Nama contoh ${i}`, posyandu: 'Posyandu contoh', notes: 'Catatan contoh',
    birthDate: category === 'Bayi' ? today : '2024-01-01', nik: '0012345678901234', weightKg: 4, heightCm: 54,
  })).flatMap(row => row.category === 'Bayi' ? Array.from({length:15}, (_,i) => ({...row,id:row.id+'-'+i,name:'Bayi contoh '+String(i).padStart(2,'0')})) : [row]);
  for (const role of ['KADER', 'BIDAN']) for (const route of ['bayi', 'balita', 'ibu-hamil', 'laporan']) {
    const html = await fixture({ role, reportRows, pathname: `/${route}` }).render(route, {}, true);
    writeFileSync(path.join(directory, `${role.toLowerCase()}-${route}.html`), `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${readFileSync('app/globals.css', 'utf8')}</style></head><body>${html}</body></html>`);
  }
  for (const role of ['KADER', 'BIDAN']) for (const [name, params] of Object.entries({
    'semua-2': { category: 'semua', page_bayi: '2' }, bayi: { category: 'bayi' }, balita: { category: 'balita' }, 'ibu-hamil': { category: 'ibu-hamil' },
  })) {
    const html = await fixture({ role, reportRows, pathname: '/laporan' }).render('laporan', params, true);
    writeFileSync(path.join(directory, `${role.toLowerCase()}-laporan-${name}.html`), `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${readFileSync('app/globals.css', 'utf8')}</style></head><body>${html}</body></html>`);
  }
});
