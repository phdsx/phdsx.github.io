const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('./engine/lcd.js'), 'utf8');
const ajaxCode = source.slice(source.indexOf('function ajaxGet('), source.indexOf('var dynLib = null;'));
const loadCode = source.slice(source.indexOf('function loadLibFromUrl('), source.indexOf('function loadLib(files)'));
const defaultCode = source.slice(source.indexOf('function loadLibDefault('), source.indexOf('function bayeMain('));

test('local file responses with status 0 and data are accepted', () => {
  let received;
  let errors = 0;
  const blob = { size: 4 };
  const context = {
    XMLHttpRequest: class {
      status = 0;
      response = blob;
      open() {}
      send() { this.onload(); }
    }
  };
  vm.runInNewContext(ajaxCode, context);
  context.ajaxGet('assets/dictionary-original.lib', value => { received = value; }, () => { errors++; });
  assert.equal(received, blob);
  assert.equal(errors, 0);
});

test('empty local file responses report failure', () => {
  let errors = 0;
  const context = {
    XMLHttpRequest: class {
      status = 0;
      response = { size: 0 };
      open() {}
      send() { this.onload(); }
    }
  };
  vm.runInNewContext(ajaxCode, context);
  context.ajaxGet('missing.lib', () => assert.fail('empty response must not load'), () => { errors++; });
  assert.equal(errors, 1);
});

test('file pages read the library directly without IndexedDB cache', () => {
  let started = false;
  const context = {
    window: { location: { protocol: 'file:' } },
    console: { log() {} },
    ajaxGet(path, loaded) { loaded({ data: 'game data' }); },
    FileReader: class {
      readAsBinaryString(file) { this.result = file.data; this.onload(); }
    },
    bin2hex(value) { return `encoded:${value}`; },
    libCacheGet() { assert.fail('file pages must bypass IndexedDB'); },
    libCacheSet() { assert.fail('file pages must bypass IndexedDB'); },
    dynLib: null
  };
  vm.runInNewContext(loadCode, context);
  context.loadLibFromUrl('assets/dictionary-original.lib', () => { started = true; });
  assert.equal(started, true);
  assert.equal(context.dynLib, 'encoded:game data');
});

test('embedded original library is byte-for-byte identical to the game data', () => {
  const original = fs.readFileSync(require.resolve('./assets/dictionary-original.lib'));
  const embedded = {};
  vm.runInNewContext(fs.readFileSync(require.resolve('./assets/dictionary-original.js'), 'utf8'), { window: embedded });
  assert.ok(Buffer.from(embedded.BAYE_DICTIONARY_ORIGINAL, 'base64').equals(original));
});

test('file pages start from the embedded original library', () => {
  let started = false;
  const context = {
    window: {
      location: { protocol: 'file:' },
      localStorage: {},
      BAYE_DICTIONARY_ORIGINAL: 'YWJj'
    },
    atob(value) { return Buffer.from(value, 'base64').toString('binary'); },
    bin2hex(value) { return Buffer.from(value, 'binary').toString('hex'); },
    loadLibFromUrl() { assert.fail('embedded library must bypass XHR'); },
    dynLib: null
  };
  vm.runInNewContext(defaultCode, context);
  context.loadLibDefault(() => { started = true; });
  assert.equal(started, true);
  assert.equal(context.dynLib, '616263');
});
