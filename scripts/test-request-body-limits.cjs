#!/usr/bin/env node
const assert = require('node:assert/strict');
require('./register-web-typescript.cjs');
const { readJsonBody, RequestBodyError } = require('../apps/web/src/lib/request-body.ts');

async function main() {
  const valid = new Request('http://localhost/test', { method: 'POST', body: JSON.stringify({ action: 'start' }) });
  assert.deepEqual(await readJsonBody(valid, 64), { action: 'start' });

  const lied = new Request('http://localhost/test', {
    method: 'POST', headers: { 'content-length': '1' }, body: 'x'.repeat(65),
  });
  await assert.rejects(readJsonBody(lied, 64), error => error instanceof RequestBodyError && error.status === 413);

  const declared = new Request('http://localhost/test', {
    method: 'POST', headers: { 'content-length': '65' }, body: '{}',
  });
  await assert.rejects(readJsonBody(declared, 64), error => error instanceof RequestBodyError && error.status === 413);

  const invalid = new Request('http://localhost/test', { method: 'POST', body: '{' });
  await assert.rejects(readJsonBody(invalid, 64), error => error instanceof RequestBodyError && error.status === 400);
  const nullBody = new Request('http://localhost/test', { method: 'POST', body: 'null' });
  await assert.rejects(readJsonBody(nullBody, 64), error => error instanceof RequestBodyError && error.status === 400);
  console.log('PASS bounded JSON rejects declared and actual oversize bodies, including false Content-Length.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
