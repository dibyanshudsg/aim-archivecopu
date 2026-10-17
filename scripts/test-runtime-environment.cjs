const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const turbo = JSON.parse(fs.readFileSync(path.join(root, 'turbo.json')));
const example = fs.readFileSync(path.join(root, 'apps/web/.env.local.example'), 'utf8');
const exampleNames = new Set([...example.matchAll(/^\s*(?:#\s*)?([A-Z][A-Z0-9_]*)=/gm)].map(m => m[1]));
const names = new Set();
function inspect(file) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)|\benv\(['"]([A-Z][A-Z0-9_]*)['"]\)/g)) names.add(match[1] || match[2]);
}
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.[cm]?[jt]sx?$/.test(file)) inspect(file);
  }
}
walk(path.join(root, 'apps/web/src'));
for (const file of ['apps/web/next.config.ts', 'scripts/dev-web.cjs']) inspect(path.join(root, file));
names.delete('NODE_ENV'); // Set by Next/pnpm, not a user secret or example setting.
names.delete('VERCEL'); // Set by Vercel itself, not a user-configured variable.
for (const name of names) {
  assert.ok(exampleNames.has(name), `Missing example: ${name}`);
  assert.ok(turbo.globalEnv.includes(name), `Missing strict-mode propagation: ${name}`);
}
assert.ok(turbo.globalDependencies.includes('**/.env*'), 'File-loaded variables must invalidate caches');
assert.ok(turbo.tasks.build.outputs.includes('.next-*/**'));

// Real Turbo strict-mode planning with synthetic values only. Never print its raw
// output: future versions may include configuration or environment information.
const env = { ...process.env, TURBO_TELEMETRY_DISABLED: '1' };
for (const name of names) env[name] = 'synthetic-runtime-test';
const result = spawnSync(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['exec', 'turbo', 'run', 'build', '--dry=json'], {
  cwd: root, env, encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 8 * 1024 * 1024,
});
if (result.error || result.status !== 0) throw new Error('Turbo dry-run failed; no raw output disclosed.');
const planStart = result.stdout.search(/^\{/m);
if (planStart < 0) throw new Error('Turbo dry-run returned no JSON plan.');
const plan = JSON.parse(result.stdout.slice(planStart));
const configured = plan.globalCacheInputs.environmentVariables.configured;
for (const name of names) assert.ok(configured.some(value => value.startsWith(name + '=')), `Turbo omitted ${name}`);
console.log(`PASS ${names.size} app/dev configuration names documented and propagated by real Turbo strict-mode planning; env-file cache inputs and isolated output paths covered.`);
