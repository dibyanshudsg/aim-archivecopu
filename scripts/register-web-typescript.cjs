// Shared standalone runtime for web-library workers and isolated tests.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
const fromWeb = Module.createRequire(path.join(root, 'apps/web/package.json'));
const ts = fromWeb('typescript');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, parent, ...args) {
  if (name.startsWith('@/')) name = path.join(root, 'apps/web/src', name.slice(2));
  return resolve.call(this, name, parent, ...args);
};
require.extensions['.ts'] = (module, file) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    file,
  );
module.exports = { root, fromWeb };
