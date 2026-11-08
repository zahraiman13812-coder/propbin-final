const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function makeLoader(mocks = {}, env = {}) {
  const cache = new Map();
  const root = path.resolve(__dirname, '..');
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const js = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
      compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    vm.runInNewContext(js, { exports, Buffer, URL, Request, Response, TextDecoder, Uint8Array,
      fetch: mocks.fetch,
      console: { error() {}, warn() {}, log() {} }, structuredClone, AbortSignal,
      process: { env: { ...env }, cwd: () => root },
      require(name) {
        if (name in mocks) return mocks[name];
        if (name === 'server-only') return {};
        if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
        if (name.startsWith('node:')) return require(name);
        if (name.startsWith('.')) return load(path.join(path.dirname(file), name) + '.ts');
        throw Error(`Unexpected import ${name}`);
      },
    }, { filename: file });
    return exports;
  }
  return load;
}
module.exports = { makeLoader };
