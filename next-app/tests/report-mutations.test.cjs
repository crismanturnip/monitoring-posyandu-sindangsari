const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');

require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  module._compile(outputText, filename);
};
const { loadReportRows, normalizeReportFilters } = require('../lib/reports.ts');
const { reportTables } = require('../lib/report-tables.ts');

const sources = {
  child_measurements: ['child_id', 'children', 'measured_at'],
  pregnancy_visits: ['pregnant_mother_id', 'pregnant_mothers', 'visited_at'],
  elderly_examinations: ['elderly_person_id', 'elderly_people', 'examined_at'],
};
const childForm = {
  name: 'Balita pengujian', nik: '1234567890123456', motherName: 'Ibu pengujian',
  posyanduId: 'pos-a', birthDate: '2025-01-01', gender: 'PEREMPUAN', kmsStatus: 'NONE',
};
const form = (values) => {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
};
const filters = (extra = {}) => normalizeReportFilters({
  period: 'custom', start: '2026-11-01', end: '2026-11-30', posyandu: 'pos-a', ...extra,
});

// Exercise actual Supabase query construction against an isolated in-memory HTTP fixture.
// No request is sent to the production database.
function fixture({ failingTable, existing = {}, apiLimit = 1000, readErrorOffset = Infinity } = {}) {
  const tables = {
    children: [{ id: 'child-1', name: 'Balita tersimpan', posyandu_id: 'pos-a' }],
    pregnant_mothers: [{ id: 'mother-1', name: 'Ibu tersimpan', posyandu_id: 'pos-a' }],
    elderly_people: [{ id: 'elderly-1', name: 'Lansia tersimpan', posyandu_id: 'pos-a' }],
    child_measurements: [], pregnancy_visits: [], elderly_examinations: [], ...existing,
  };
  for (const table of ['children', 'pregnant_mothers', 'elderly_people']) {
    for (const person of tables[table]) {
      person.registered_posyandu_id ??= person.posyandu_id;
      person.registered_posyandu_name ??= 'Posyandu pengujian';
    }
  }
  for (const [table, [personKey, personTable]] of Object.entries(sources)) {
    for (const row of tables[table]) {
      const person = tables[personTable].find(item => item.id === row[personKey]);
      row.recorded_posyandu_id ??= person?.posyandu_id;
      row.recorded_posyandu_name ??= 'Posyandu pengujian';
    }
  }
  const requests = [], invalidated = [];
  const supabase = createClient('https://example.supabase.co', 'test-public-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init = {}) => {
      const url = new URL(String(input));
      const table = url.pathname.split('/').at(-1);
      const method = init.method ?? 'GET';
      const payload = init.body ? JSON.parse(init.body) : null;
      requests.push({ table, method, url, payload });
      assert(table in tables, `Unexpected table: ${table}`);
      if (method === 'GET' && sources[table] && Number(url.searchParams.get('offset') ?? 0) >= readErrorOffset) {
        return new Response(JSON.stringify({ message: 'Halaman laporan gagal dimuat', code: 'XX000' }), {
          status: 500, headers: { 'Content-Type': 'application/json' },
        });
      }
      if (table === failingTable && method !== 'GET') {
        return new Response(JSON.stringify({ message: 'Penyimpanan ditolak', code: '42501' }), {
          status: 403, headers: { 'Content-Type': 'application/json' },
        });
      }
      const matches = (row) => [...url.searchParams].every(([key, expression]) => {
        if (['select', 'order', 'limit', 'offset'].includes(key)) return true;
        const actual = key.split('.').reduce((value, part) => value?.[part], row);
        const separator = expression.indexOf('.');
        const operator = expression.slice(0, separator), expected = expression.slice(separator + 1);
        if (operator === 'eq') return actual === expected;
        if (operator === 'is' && expected === 'null') return actual == null;
        if (operator === 'gte') return key === 'created_at' ? new Date(actual).getTime() >= new Date(expected).getTime() : actual >= expected;
        if (operator === 'lte') return key === 'created_at' ? new Date(actual).getTime() <= new Date(expected).getTime() : actual <= expected;
        return true;
      });
      let data;
      if (method === 'POST') {
        const row = { id: `${table}-${tables[table].length + 1}`, ...(!sources[table] ? { created_at: '2026-11-17T01:00:00Z' } : {}), ...payload };
        if (!sources[table] && row.posyandu_id) {
          row.registered_posyandu_id = row.posyandu_id;
          row.registered_posyandu_name = 'Posyandu pengujian';
        }
        if (sources[table]) {
          row.recorded_posyandu_id = tables[sources[table][1]].find(person => person.id === row[sources[table][0]])?.posyandu_id;
          row.recorded_posyandu_name = 'Posyandu pengujian';
        }
        tables[table].push(row);
        data = [row];
      } else if (method === 'PATCH') {
        data = tables[table].filter(matches);
        data.forEach((row) => Object.assign(row, payload));
      } else {
        data = tables[table].map((row) => {
          const source = sources[table];
          if (!source) return row;
          const parent = tables[source[1]].find((person) => person.id === row[source[0]]);
          return { ...row, [source[1]]: parent && { ...parent, posyandu: { name: 'Posyandu pengujian' } } };
        }).filter(matches);
        const order = url.searchParams.get('order');
        if (order) {
          data.sort((a, b) => {
            for (const rule of order.split(',')) {
              const [column, direction] = rule.split('.');
              const compared = (direction === 'desc' ? -1 : 1) * String(a[column]).localeCompare(String(b[column]));
              if (compared) return compared;
            }
            return 0;
          });
        }
        const count = data.length;
        const offset = Number(url.searchParams.get('offset') ?? 0);
        data = data.slice(offset, offset + Math.min(apiLimit, Number(url.searchParams.get('limit') ?? apiLimit)));
        url.fixtureCount = count;
      }
      const single = String(new Headers(init.headers).get('Accept')).includes('vnd.pgrst.object');
      return new Response(JSON.stringify(single ? data[0] ?? null : data), {
        headers: { 'Content-Type': 'application/json', 'Content-Range': `0-${Math.max(0, data.length - 1)}/${url.fixtureCount ?? data.length}` },
      });
    } },
  });
  function actions(category) {
    const filename = path.resolve(__dirname, `../app/(protected)/${category}/actions.ts`);
    const actionModule = new Module(filename, module);
    actionModule.filename = filename;
    actionModule.paths = Module._nodeModulePaths(path.dirname(filename));
    const mocks = {
      'next/cache': { revalidatePath: (value) => invalidated.push(value) },
      'next/navigation': { redirect: (value) => { throw Object.assign(new Error('redirect'), { destination: value }); } },
      '@/lib/auth': {
        requireActiveProfile: async () => ({ profile: { id: 'officer-1', full_name: 'Petugas uji', role: 'BIDAN' }, supabase }),
        requireBidan: async () => ({ profile: { id: 'officer-1', full_name: 'Petugas uji', role: 'BIDAN' }, supabase }),
      },
    };
    actionModule.require = (name) => {
      if (name in mocks) return mocks[name];
      if (name.startsWith('@/')) return require(path.resolve(__dirname, '..', `${name.slice(2)}.ts`));
      return Module.prototype.require.call(actionModule, name);
    };
    const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
      fileName: filename,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    actionModule._compile(outputText, filename);
    return actionModule.exports;
  }
  return { actions, supabase, tables, requests, invalidated };
}

test('creating a balita with an initial measurement adds that measurement to reports', async () => {
  const app = fixture();
  await assert.rejects(app.actions('balita').createChild(form({
    ...childForm, measuredAt: '2026-11-17', weightKg: '10.5', heightCm: '80',
    motherNik: '1111222233334444', fatherName: 'Ayah pengujian', fatherNik: '5555666677778888',
    phoneNumber: '081234567890', headCircumferenceCm: '46.2', lilaCm: '15.5', notes: 'Sehat',
  })), (error) => error.destination?.startsWith('/balita/'));
  const report = await loadReportRows(app.supabase, filters());
  assert.equal(report.error, null);
  assert.equal(report.rows.length, 1);
  assert.equal(report.rows[0].name, childForm.name);
  assert.equal(report.rows[0].result, 'BB 10.5 kg; TB/PB 80 cm');
  assert.equal(report.rows[0].date, '2026-11-17');
  assert.equal(report.rows[0].motherNik, '1111222233334444');
  assert.equal(report.rows[0].fatherName, 'Ayah pengujian');
  assert.equal(report.rows[0].phone, '081234567890');
  assert.equal(report.rows[0].headCircumferenceCm, 46.2);
  assert.equal(report.rows[0].lilaCm, 15.5);
  assert.equal(report.rows[0].notes, 'Sehat');
  assert(app.invalidated.includes('/laporan'));
  // Current measurements must never be stored as birth measurements.
  const created = app.tables.children.at(-1);
  assert.equal(created.birth_weight_kg, null);
  assert.equal(created.birth_length_cm, null);
});

test('registration appears without fabricating an examination from birth details', async () => {
  const app = fixture();
  await assert.rejects(app.actions('balita').createChild(form({
    ...childForm, birthWeight: '3.1', birthLength: '49.5',
  })), (error) => Boolean(error.destination));
  assert.equal(app.tables.children.at(-1).birth_weight_kg, 3.1);
  assert.equal(app.tables.children.at(-1).birth_length_cm, 49.5);
  const report = await loadReportRows(app.supabase, filters());
  assert.equal(report.rows.length, 1);
  assert.equal(report.rows[0].weightKg, undefined);
  assert.equal(report.rows[0].heightCm, undefined);
  assert.equal(app.tables.child_measurements.length, 0);
});

test('editing a baby updates birth weight and length without adding a measurement', async () => {
  const app = fixture();
  await assert.rejects(app.actions('balita').updateChildFromModal(form({
    ...childForm,
    nik: '',
    id: 'child-1',
    returnPath: '/bayi',
    birthWeight: '3.25',
    birthLength: '50.5',
  })), error => error.destination === '/bayi');

  assert.equal(app.tables.children[0].nik, null);
  assert.equal(app.tables.children[0].birth_weight_kg, 3.25);
  assert.equal(app.tables.children[0].birth_length_cm, 50.5);
  assert.equal(app.tables.child_measurements.length, 0);
  assert(app.invalidated.includes('/bayi/child-1'));
});

test('creating a baby allows an empty NIK but validates a supplied NIK', async () => {
  const { jakartaDate } = require('../lib/health-record-dates.ts');
  const app = fixture();
  await assert.rejects(app.actions('balita').createChild(form({
    ...childForm, name: 'Bayi tanpa NIK', nik: '', birthDate: jakartaDate(), returnPath: '/bayi',
  })), error => error.destination === '/bayi/children-2');
  assert.equal(app.tables.children.at(-1).nik, null);

  const invalid = fixture();
  await assert.rejects(invalid.actions('balita').createChild(form({
    ...childForm, nik: '123', birthDate: jakartaDate(), returnPath: '/bayi',
  })), /Lengkapi semua data wajib/);
  assert.equal(invalid.requests.length, 0);
});

test('NIK remains required for balita create and edit forms', async () => {
  const create = fixture();
  await assert.rejects(create.actions('balita').createChild(form({ ...childForm, nik: '', returnPath: '/balita' })), /Lengkapi semua data wajib/);
  assert.equal(create.requests.length, 0);

  const edit = fixture();
  await assert.rejects(edit.actions('balita').updateChildFromModal(form({
    ...childForm, nik: '', id: 'child-1', returnPath: '/balita',
  })), /NIK 16 digit/);
  assert.equal(edit.requests.length, 0);
});

test('editing a baby from its detail form accepts an empty NIK', async () => {
  const app = fixture();
  await app.actions('balita').updateChild(form({
    ...childForm, nik: '', id: 'child-1', returnPath: '/bayi',
  }));
  assert.equal(app.tables.children[0].nik, null);
});

test('newborn registration opens baby details and refreshes both registers', async () => {
  const app = fixture();
  const { jakartaDate } = require('../lib/health-record-dates.ts');
  await assert.rejects(app.actions('balita').createChild(form({
    ...childForm, birthDate: jakartaDate(), gestationalWeeks: '38',
  })), error => error.destination === '/bayi/children-2');
  assert.equal(app.tables.children.length, 2);
  assert.equal(app.tables.children.at(-1).gestational_age_weeks, 38);
  assert(app.invalidated.includes('/bayi'));
  assert(app.invalidated.includes('/balita'));
  assert(app.invalidated.includes('/laporan'));
});

test('saving and archiving from the baby register retain local navigation and refresh both categories', async () => {
  const app = fixture({ existing: { children: [{ id: 'child-1', name: 'Balita tersimpan', posyandu_id: 'pos-a', gestational_age_weeks: 38 }] } });
  await assert.rejects(app.actions('balita').updateChildFromModal(form({
    ...childForm, id: 'child-1', returnPath: '/bayi',
  })), error => error.destination === '/bayi');
  assert.equal(app.tables.children[0].gestational_age_weeks, 38);
  await assert.rejects(app.actions('balita').addMeasurement(form({
    childId: 'child-1', returnPath: '/bayi', measuredAt: '2026-11-17', weightKg: '4', heightCm: '54',
  })), error => error.destination === '/bayi/child-1');
  await assert.rejects(app.actions('balita').softDeleteChild(form({ id: 'child-1', returnPath: '/bayi' })), error => error.destination === '/bayi');
  assert(app.invalidated.includes('/bayi/child-1'));
  assert(app.invalidated.includes('/balita/child-1'));
  assert(app.invalidated.includes('/laporan'));
  assert.equal(app.tables.child_measurements.length, 1);
});

test('incomplete or invalid initial measurements are rejected before creating a balita', async () => {
  for (const measurement of [
    { measuredAt: '2026-11-17', weightKg: '10' },
    { measuredAt: '2026-11-17', weightKg: '0', heightCm: '80' },
    { measuredAt: '2026-02-30', weightKg: '10', heightCm: '80' },
    { weightKg: '10', heightCm: '80' },
  ]) {
    const app = fixture();
    await assert.rejects(app.actions('balita').createChild(form({ ...childForm, ...measurement })),
      (error) => !error.destination);
    assert.equal(app.requests.length, 0);
  }
});

const historyCases = [
  ['balita', 'addMeasurement', 'child_measurements', { childId: 'child-1', measuredAt: '2026-11-17', weightKg: '11', heightCm: '82' }],
  ['ibu-hamil', 'addPregnancyVisit', 'pregnancy_visits', { pregnantMotherId: 'mother-1', visitedAt: '2026-11-17' }],
  ['lansia', 'addElderlyExamination', 'elderly_examinations', { elderlyPersonId: 'elderly-1', examinedAt: '2026-11-17' }],
];
for (const [category, action, table, fields] of historyCases) {
  test(`${category}: a new history row appears in scoped reports after saving`, async () => {
    const app = fixture();
    assert.equal((await loadReportRows(app.supabase, filters({ category }))).rows.length, 0);
    const save = app.actions(category)[action](form({ ...fields, notes: 'Hasil baru' }));
    await assert.rejects(save, (error) => error.destination === `/${category}/${Object.values(fields)[0]}`);
    const report = await loadReportRows(app.supabase, filters({ category }));
    assert.equal(report.error, null);
    assert.equal(report.rows.length, 1);
    assert.equal(report.rows[0].notes, 'Hasil baru');
    assert.equal((await loadReportRows(app.supabase, filters({ category, posyandu: 'pos-b' }))).rows.length, 0);
    assert.equal((await loadReportRows(app.supabase, filters({ category, end: '2026-11-16' }))).rows.length, 0);
    assert(app.invalidated.includes('/laporan'));
    assert(app.invalidated.includes(`/${category}`));
  });
  test(`${category}: a rejected history insert surfaces an error rather than succeeding silently`, async () => {
    const app = fixture({ failingTable: table });
    await assert.rejects(app.actions(category)[action](form(fields)), /Penyimpanan ditolak/);
    assert.equal(app.tables[table].length, 0);
    assert.equal(app.invalidated.length, 0);
  });
}

test('lansia registration directs a failed initial examination to a retry form', async () => {
  const app = fixture({ failingTable: 'elderly_examinations' });
  await assert.rejects(app.actions('lansia').createElderlyPerson(form({
    name: 'Lansia pengujian', posyanduId: 'pos-a', bloodPressure: '120/80',
  })), (error) => error.destination?.endsWith('?examination=failed'));
  assert(app.invalidated.includes('/laporan'));
});

test('a failed initial balita measurement preserves the identity and can be retried separately', async () => {
  const app = fixture({ failingTable: 'child_measurements' });
  await assert.rejects(app.actions('balita').createChild(form({
    ...childForm, measuredAt: '2026-11-17', weightKg: '10', heightCm: '80',
  })), (error) => error.destination?.endsWith('?measurement=failed'));
  assert.equal(app.tables.children.length, 2);
  assert.equal(app.tables.child_measurements.length, 0);
  assert(app.invalidated.includes('/laporan'));
  const retry = fixture({ existing: { children: app.tables.children } });
  await assert.rejects(retry.actions('balita').addMeasurement(form({
    childId: app.tables.children[1].id, measuredAt: '2026-11-17', weightKg: '10', heightCm: '80',
  })), (error) => error.destination === `/balita/${app.tables.children[1].id}`);
  assert.equal(retry.tables.children.length, 2);
  assert.equal((await loadReportRows(retry.supabase, filters())).rows.length, 1);
});

test('editing lansia identity alone preserves history; new notes append a report examination', async () => {
  const app = fixture({ existing: { elderly_examinations: [{
    id: 'exam-1', elderly_person_id: 'elderly-1', examined_at: '2026-11-01', officer_notes: 'Catatan lama',
  }] } });
  await app.actions('lansia').updateElderlyPerson(form({ id: 'elderly-1', name: 'Nama baru' }));
  assert.equal(app.tables.elderly_examinations.length, 1);
  await app.actions('lansia').updateElderlyPerson(form({ id: 'elderly-1', name: 'Nama baru', notes: 'Catatan baru' }));
  assert.equal(app.tables.elderly_examinations.length, 2);
  assert.equal(app.tables.elderly_examinations[0].officer_notes, 'Catatan lama');
  assert(!app.requests.some((request) => request.table === 'elderly_examinations' && request.method === 'PATCH'));
  assert(app.invalidated.includes('/laporan'));
});

test('automatic examination dates use WIB at the UTC day boundary', async () => {
  const OriginalDate = global.Date;
  global.Date = class extends OriginalDate {
    constructor(...args) { super(...(args.length ? args : ['2026-11-16T17:05:00Z'])); }
  };
  try {
    const app = fixture();
    await assert.rejects(app.actions('balita').updateChildFromModal(form({
      ...childForm, id: 'child-1', weightKg: '11', heightCm: '82',
    })), (error) => Boolean(error.destination));
    assert.equal(app.tables.child_measurements.length, 0, 'Identity edits must not add a measurement');
    await assert.rejects(app.actions('balita').addMeasurement(form({
      childId: 'child-1', measuredAt: '2026-11-17', weightKg: '11', heightCm: '82',
    })), (error) => Boolean(error.destination));
    await assert.rejects(app.actions('lansia').createElderlyPerson(form({
      name: 'Lansia baru', posyanduId: 'pos-a', bloodPressure: '120/80',
    })), (error) => Boolean(error.destination));
    assert.equal(app.tables.child_measurements[0].measured_at, '2026-11-17');
    assert.equal(app.tables.elderly_examinations[0].examined_at, '2026-11-17');
  } finally {
    global.Date = OriginalDate;
  }
});

test('the mother registration form preserves clinical fields in a dated report visit', async () => {
  const app = fixture();
  await assert.rejects(app.actions('ibu-hamil').createPregnantMother(form({
    name: 'Ibu baru', posyanduId: 'pos-a', visitedAt: '2026-11-17', weight: '52.5', height: '158', lila: '24,0',
    nik: '1111222233334444', birthDate: '1998-05-14', husbandName: 'Suami pengujian',
    husbandNik: '5555666677778888', phoneNumber: '081234567890', gestationalWeeks: '24',
    hpht: '2026-05-31', gravida: '3', para: '1', abortus: '1',
  })), (error) => error.destination?.startsWith('/ibu-hamil/') && !error.destination.includes('failed'));
  const savedMother = app.tables.pregnant_mothers.at(-1);
  assert.equal(savedMother.hpht, '2026-05-31');
  assert.equal(savedMother.gravida, 3);
  assert.equal(savedMother.para, 1);
  assert.equal(savedMother.abortus, 1);
  const report = await loadReportRows(app.supabase, filters());
  assert.equal(report.rows.length, 1);
  assert.match(report.rows[0].notes, /BB: 52.5 kg/);
  assert.match(report.rows[0].notes, /TB: 158 cm/);
  assert.match(report.rows[0].notes, /LiLA: 24.0 cm/);
  assert.equal(report.rows[0].date, '2026-11-17');
  assert.equal(report.rows[0].nik, '1111222233334444');
  assert.equal(report.rows[0].birthDate, '1998-05-14');
  assert.equal(report.rows[0].husbandName, 'Suami pengujian');
  assert.equal(report.rows[0].phone, '081234567890');
  assert.equal(report.rows[0].gestationalWeeks, 24);
});

test('invalid HPHT and pregnancy counts are rejected before saving the mother', async () => {
  const app = fixture();
  const create = app.actions('ibu-hamil').createPregnantMother;
  const base = { name: 'Ibu validasi', posyanduId: 'pos-a', visitedAt: '2026-11-17' };
  await assert.rejects(create(form({ ...base, hpht: '2026-02-30' })), /Tanggal HPHT tidak valid/);
  await assert.rejects(create(form({ ...base, gravida: '0' })), /gravida harus berupa bilangan bulat/);
  await assert.rejects(create(form({ ...base, para: '-1' })), /para harus berupa bilangan bulat/);
  assert.equal(app.tables.pregnant_mothers.length, 1);
});

test('mother registration without clinical results does not fabricate a visit', async () => {
  const app = fixture();
  await assert.rejects(app.actions('ibu-hamil').createPregnantMother(form({
    name: 'Ibu tanpa pemeriksaan', posyanduId: 'pos-a', visitedAt: '2026-11-17',
  })), (error) => Boolean(error.destination));
  assert.equal(app.tables.pregnancy_visits.length, 0);
});

test('mother registration can retry a rejected initial examination without registering twice', async () => {
  const app = fixture({ failingTable: 'pregnancy_visits' });
  await assert.rejects(app.actions('ibu-hamil').createPregnantMother(form({
    name: 'Ibu baru', posyanduId: 'pos-a', visitedAt: '2026-11-17', weight: '52.5',
  })), (error) => error.destination?.endsWith('?visit=failed'));
  assert.equal(app.tables.pregnant_mothers.length, 2);
  assert.equal(app.tables.pregnancy_visits.length, 0);
});

test('mother identity updates preserve history and never append a visit', async () => {
  const app = fixture();
  await app.actions('ibu-hamil').updatePregnantMother(form({
    id: 'mother-1', name: 'Nama baru', posyanduId: 'pos-b', visitedAt: '2026-11-17',
    weight: '58', height: '158', bloodPressure: '110/70', lila: '25,5',
    hpht: '2026-06-01', gravida: '2', para: '1', abortus: '0',
  }));
  assert.equal((await loadReportRows(app.supabase, filters())).rows.length, 0);
  assert.equal(app.tables.pregnancy_visits.length, 0);
  assert.equal(app.tables.pregnant_mothers[0].posyandu_id, 'pos-b');
  assert.equal(app.tables.pregnant_mothers[0].hpht, '2026-06-01');
  assert.equal(app.tables.pregnant_mothers[0].gravida, 2);
  assert.equal(app.tables.pregnant_mothers[0].para, 1);
  assert.equal(app.tables.pregnant_mothers[0].abortus, 0);
});

test('moving a person does not rewrite their original registration report location', async () => {
  const app = fixture();
  await assert.rejects(app.actions('balita').createChild(form(childForm)), error => Boolean(error.destination));
  const child = app.tables.children.at(-1);
  await assert.rejects(app.actions('balita').updateChildFromModal(form({
    ...childForm, id: child.id, posyanduId: 'pos-b',
  })), error => Boolean(error.destination));
  const original = await loadReportRows(app.supabase, filters({ category: 'balita' }));
  assert.equal(original.rows.length, 1);
  assert.equal(original.rows[0].posyandu, 'Posyandu pengujian');
  const destination = await loadReportRows(app.supabase, filters({ category: 'balita', posyandu: 'pos-b' }));
  assert.equal(destination.rows.length, 0);
});

test('correcting a selected measurement updates the same report row and keeps its Posyandu snapshot', async () => {
  const app = fixture({ existing: { child_measurements: [{
    id: 'measurement-1', child_id: 'child-1', measured_at: '2026-11-17', weight_kg: 10, height_cm: 80, officer_notes: 'Lama',
  }] } });
  await app.actions('balita').updateMeasurement(form({
    measurementId: 'measurement-1', childId: 'child-1', measuredAt: '2026-11-18', weightKg: '11', heightCm: '82', notes: 'Koreksi',
  }));
  assert.equal(app.tables.child_measurements.length, 1);
  const report = await loadReportRows(app.supabase, filters());
  assert.equal(report.rows.length, 1);
  assert.equal(report.rows[0].date, '2026-11-18');
  assert.equal(report.rows[0].weightKg, 11);
  assert.equal(report.rows[0].notes, 'Koreksi');
  assert.equal(report.rows[0].posyandu, 'Posyandu pengujian');
});

test('correcting a selected pregnancy visit keeps one report row', async () => {
  const app = fixture({ existing: { pregnancy_visits: [{
    id: 'visit-1', pregnant_mother_id: 'mother-1', visited_at: '2026-11-17', officer_notes: 'BB: 50 kg\nTD: 120/80 mmHg',
  }] } });
  await app.actions('ibu-hamil').updatePregnancyVisit(form({
    visitId: 'visit-1', pregnantMotherId: 'mother-1', visitedAt: '2026-11-18', weight: '51', bloodPressure: '110/70', notes: 'Koreksi',
  }));
  assert.equal(app.tables.pregnancy_visits.length, 1);
  const report = await loadReportRows(app.supabase, filters({ category: 'ibu-hamil' }));
  assert.equal(report.rows.length, 1);
  assert.equal(report.rows[0].date, '2026-11-18');
  assert.match(report.rows[0].notes, /BB: 51 kg/);
  assert.match(report.rows[0].notes, /TD: 110\/70 mmHg/);
});

test('lansia registration and editing preserve every submitted examination result', async () => {
  const app = fixture();
  const clinical = { examinedAt: '2026-11-17', bloodPressure: '120/80', bloodSugar: '110',
    cholesterol: '180', uricAcid: '5.2', weight: '58.5', height: '162', aks: 'Mandiri (Kategori A)', notes: 'Catatan pengujian' };
  await assert.rejects(app.actions('lansia').createElderlyPerson(form({
    ...clinical, name: 'Lansia baru', posyanduId: 'pos-a',
  })), (error) => Boolean(error.destination));
  await app.actions('lansia').updateElderlyPerson(form({ ...clinical, id: 'elderly-1', name: 'Lansia lama' }));
  const report = await loadReportRows(app.supabase, filters({ category: 'lansia' }));
  assert.equal(report.rows.length, 2);
  for (const row of report.rows) {
    for (const value of ['TD: 120/80 mmHg', 'GDS: 110 mg/dL', 'Kolesterol: 180 mg/dL',
      'Asam urat: 5.2 mg/dL', 'BB: 58.5 kg', 'TB: 162 cm', 'Kemandirian: Mandiri (Kategori A)', 'Catatan pengujian']) {
      assert(row.notes.includes(value), value);
    }
  }
});

test('invalid adult clinical values are rejected before identity data is saved', async () => {
  for (const [category, action, clinical] of [
    ['ibu-hamil', 'createPregnantMother', { lila: 'abc', visitedAt: '2026-11-17' }],
    ['ibu-hamil', 'createPregnantMother', { weight: '52.5', visitedAt: '2026-02-30' }],
    ['lansia', 'createElderlyPerson', { bloodSugar: '-1', examinedAt: '2026-11-17' }],
  ]) {
    const app = fixture();
    await assert.rejects(app.actions(category)[action](form({ name: 'Uji', posyanduId: 'pos-a', ...clinical })),
      (error) => !error.destination);
    assert.equal(app.requests.length, 0);
  }
});

test('reports include all 1201 records beyond the API response limit, with stable date/id ordering', async () => {
  const rows = Array.from({ length: 1201 }, (_, i) => ({
    id: `measure-${String(i).padStart(4, '0')}`, child_id: 'child-1', measured_at: '2026-11-17',
    weight_kg: 10, height_cm: 80, officer_notes: `Catatan ${i}`,
  }));
  const app = fixture({ existing: { child_measurements: rows } });
  const report = await loadReportRows(app.supabase, filters({ category: 'balita' }));
  assert.equal(report.error, null);
  assert.equal(report.rows.length, 1201);
  assert.equal(new Set(report.rows.map(row => row.id)).size, 1201);
  const reads = app.requests.filter(r => r.table === 'child_measurements');
  assert.deepEqual(reads.map(r => r.url.searchParams.get('offset')), ['0', '500', '1000']);
  assert(reads.every(r => r.url.searchParams.get('order') === 'measured_at.desc,id.asc'));
});

test('archived records leave the active recap while their clinical history remains stored', async () => {
  for (const [category, action, table, fields] of historyCases) {
    const app = fixture();
    await assert.rejects(app.actions(category)[action](form(fields)), error => Boolean(error.destination));
    assert.equal((await loadReportRows(app.supabase, filters({ category }))).rows.length, 1);
    const deleteAction = { balita: 'softDeleteChild', 'ibu-hamil': 'softDeletePregnantMother', lansia: 'softDeleteElderlyPerson' }[category];
    await assert.rejects(app.actions(category)[deleteAction](form({ id: Object.values(fields)[0] })), error => Boolean(error.destination));
    assert.equal(app.tables[table].length, 1);
    assert.equal((await loadReportRows(app.supabase, filters({ category }))).rows.length, 0);
    assert(app.invalidated.includes('/laporan'));
  }
});

test('smaller API limits still return every report row and a failed later page never yields partial totals', async () => {
  const rows = Array.from({ length: 601 }, (_, index) => ({
    id: `measurement-${index}`, child_id: 'child-1', measured_at: '2026-11-17', weight_kg: 10, height_cm: 80,
  }));
  const app = fixture({ existing: { child_measurements: rows }, apiLimit: 100 });
  assert.equal((await loadReportRows(app.supabase, filters())).rows.length, 601);
  const failed = fixture({ existing: { child_measurements: rows }, readErrorOffset: 500 });
  const report = await loadReportRows(failed.supabase, filters());
  assert(report.error.includes('Halaman laporan gagal dimuat'));
  assert.equal(report.rows.length, 0);
});

test('baby and balita categories follow age on each record date and retain stored parent/contact metadata', async () => {
  const child = { id: 'newborn', name: 'Bayi Ny. Pengujian', birth_date: '2026-11-17', created_at: '2026-11-16T17:05:00Z',
    posyandu_id: 'pos-a', nik: '0000000000000001', mother_name: 'Ibu uji', mother_nik: '0000000000000002',
    father_name: 'Ayah uji', father_nik: '0000000000000003', phone_number: '081234567890',
    birth_weight_kg: 3.2, birth_length_cm: 50 };
  const app = fixture({ existing: { children: [child] } });
  let report = await loadReportRows(app.supabase, filters({ category: 'bayi', start: '2026-11-17', end: '2026-11-17' }));
  assert.equal(report.rows.length, 1);
  assert.equal(report.rows[0].date, '2026-11-17');
  assert.equal(report.rows[0].fatherNik, child.father_nik);
  assert.equal(report.rows[0].phone, child.phone_number);
  assert.equal(report.rows[0].weightKg, undefined);
  assert.equal(report.rows[0].birthWeightKg, child.birth_weight_kg);
  assert.equal(report.rows[0].birthLengthCm, child.birth_length_cm);
  const babyTable = reportTables(report.rows, filters({ category: 'bayi' }))[0];
  assert.equal(babyTable.columns.find(column => column.label === 'Berat Badan Lahir (kg)').value(report.rows[0], 0), 3.2);
  assert.equal(babyTable.columns.find(column => column.label === 'Panjang Badan Lahir (cm)').value(report.rows[0], 0), 50);
  assert.equal((await loadReportRows(app.supabase, filters({ category: 'balita' }))).rows.length, 0);
  await assert.rejects(app.actions('balita').addMeasurement(form({ childId: child.id, measuredAt: '2026-11-17', weightKg: '3.1', heightCm: '49.5' })), error => Boolean(error.destination));
  report = await loadReportRows(app.supabase, filters({ category: 'bayi' }));
  assert.equal(report.rows.length, 1, 'Registration must not duplicate its examination');
  assert.equal(report.rows[0].weightKg, 3.1);
  assert.equal(report.rows[0].birthWeightKg, 3.2);
  assert.equal(report.rows[0].birthLengthCm, 50);
  const birthday = fixture({ existing: { children: [{ ...child, birth_date: '2025-11-17' }], child_measurements: [
    { id: 'before', child_id: child.id, measured_at: '2026-11-16', weight_kg: 9, height_cm: 70 },
    { id: 'after', child_id: child.id, measured_at: '2026-11-17', weight_kg: 9.1, height_cm: 70.5 },
  ] } });
  assert.deepEqual((await loadReportRows(birthday.supabase, filters({ category: 'bayi' }))).rows.map(row => row.id), ['before']);
  assert.deepEqual((await loadReportRows(birthday.supabase, filters({ category: 'balita' }))).rows.map(row => row.id), ['after']);
});

test('registrations follow Jakarta day boundaries, Posyandu filters, and appear when history is absent', async () => {
  const mother = { id: 'mother-new', name: 'Ibu terdaftar', posyandu_id: 'pos-a', created_at: '2026-11-16T17:05:00Z' };
  const app = fixture({ existing: { pregnant_mothers: [mother] } });
  const current = filters({ category: 'ibu-hamil', start: '2026-11-17', end: '2026-11-17' });
  const report = await loadReportRows(app.supabase, current);
  assert.equal(report.rows.length, 1);
  assert.equal(report.rows[0].date, '2026-11-17');
  assert.equal(report.rows[0].result, '—');
  assert.equal((await loadReportRows(app.supabase, { ...current, posyanduId: 'pos-b' })).rows.length, 0);
  assert.equal((await loadReportRows(app.supabase, { ...current, startDate: '2026-11-16', endDate: '2026-11-16' })).rows.length, 0);
});
