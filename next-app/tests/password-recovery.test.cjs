const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../lib/password-recovery.ts');
const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
  fileName: filename,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded._compile(compiled, filename);
const { isValidRecoveredPassword } = loaded.exports;

test('recovered-password validation enforces length and confirmation', () => {
  const cases = [
    ['', '', false],
    ['1234567', '1234567', false],
    ['12345678', '12345678', true],
    ['password', 'Password', false],
    ['password1', 'password2', false],
    ['🔐🔐🔐🔐', '🔐🔐🔐🔐', true],
  ];

  for (const [password, confirmation, expected] of cases) {
    assert.equal(isValidRecoveredPassword(password, confirmation), expected, JSON.stringify({ password, confirmation }));
  }
});

test('fuzz: valid matching values pass and changed confirmations never pass', () => {
  let state = 0x51a7e;
  const random = max => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state % max;
  };
  const alphabet = Array.from('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !@#$%^&*()🔐雪');

  for (let sample = 0; sample < 500; sample += 1) {
    const length = 8 + random(80);
    const password = Array.from({ length }, () => alphabet[random(alphabet.length)]).join('');
    assert.equal(isValidRecoveredPassword(password, password), true);
    assert.equal(isValidRecoveredPassword(password, `${password}!`), false);
    assert.equal(isValidRecoveredPassword(password, password.slice(1)), false);
  }
});
