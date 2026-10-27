const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { root } = require('./register-web-typescript.cjs');
const RealDate = Date;
let current = '2026-10-27T05:00:00.000Z';
global.Date = class extends RealDate {
  constructor(...args) { super(...(args.length ? args : [current])); }
  static now() { return new RealDate(current).getTime(); }
};
process.env.R2_PUBLIC_BASE_URL = 'https://assets.example.test';
const db = new DatabaseSync(':memory:');
db.exec(fs.readFileSync(path.join(root, 'packages/turso/migrations/00001_initial_schema.sql'), 'utf8'));
const stamp = current;
db.prepare('INSERT INTO admins(id,email,name,created_at) VALUES(?,?,?,?)').run('admin','admin@example.test','Admin',stamp);
for (const [id,name] of [['aim','All India Magazine'],['hindi','Agnishikha']])
  db.prepare('INSERT INTO magazines(id,name,created_at,updated_at) VALUES(?,?,?,?)').run(id,name,stamp,stamp);
for (const [id,magazine,year,month,published] of [
  ['aim-oct','aim',2026,10,1],['aim-sep','aim',2026,9,1],['aim-nov','aim',2026,11,1],
  ['aim-archive','aim',2021,10,1],['aim-nov-archive','aim',2021,11,1],['aim-nov-previous','aim',2025,11,1],
  ['aim-older','aim',2020,10,1],['hindi-archive','hindi',2021,10,1],
]) db.prepare('INSERT INTO issues(id,magazine_id,title,year,month,is_published,pdf_url,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)')
  .run(id,magazine,id,year,month,published,`https://assets.example.test/${id}.pdf`,stamp,stamp);
require('../apps/web/src/lib/db/client.ts').getDb = () => ({
  execute: async (statement) => {
    const { sql, args = [] } = typeof statement === 'string' ? { sql: statement } : statement;
    class LibsqlRows extends Array {}
    return { rows: new LibsqlRows(...db.prepare(sql).all(...args)) };
  },
});
const { getHeroSchedule, updateHeroSetting, getLiveHeroIssueIds } = require('../apps/web/src/lib/hero-issues.ts');
const { isIssueMonthReleased } = require('../apps/web/src/lib/embargo.ts');
(async () => {
  let schedule = await getHeroSchedule();
  assert.equal(Object.getPrototypeOf(schedule), Array.prototype, 'hero schedule must cross the React server/client boundary as a plain array');
  assert.equal(Object.getPrototypeOf(schedule[0].hidden), Array.prototype);
  assert.equal(schedule.find(m => m.id === 'aim').live.id,'aim-oct');
  assert.equal(schedule.find(m => m.id === 'aim').next.id,'aim-nov');
  assert.equal(schedule.find(m => m.id === 'aim').previous_pick.id,'aim-sep');
  assert.equal(schedule.find(m => m.id === 'aim').hide_fallback.id,'aim-sep','hide confirmation should name the actual next issue');
  assert.equal(schedule.find(m => m.id === 'aim').archive_pick.id,'aim-archive');
  await updateHeroSetting('admin','hide','aim','aim-oct');
  schedule = await getHeroSchedule();
  assert.equal(schedule.find(m => m.id === 'aim').live.id,'aim-sep');
  assert.equal((await getLiveHeroIssueIds()).has('aim-oct'),false);
  await updateHeroSetting('admin','hide','aim','aim-sep');
  assert.equal((await getHeroSchedule()).find(m => m.id === 'aim').hidden.length,2,'multiple issues can be hidden for an exact restore choice');
  await updateHeroSetting('admin','show','aim','aim-sep');
  assert.equal((await getHeroSchedule()).find(m => m.id === 'aim').hidden.length,1);
  await updateHeroSetting('admin','select','aim',undefined,'archive');
  assert.equal((await getHeroSchedule()).find(m => m.id === 'aim').live.id,'aim-archive');
  assert.equal((await getHeroSchedule()).find(m => m.id === 'aim').hide_fallback.id,'aim-older','archive mode should preview its real fallback');
  assert.equal((await getHeroSchedule()).find(m => m.id === 'aim').next.id,'aim-nov-archive','archive mode previews the matching next-month archive');
  await updateHeroSetting('admin','schedule','aim',undefined,undefined,'current_year');
  assert.equal((await getHeroSchedule()).find(m => m.id === 'aim').next.id,'aim-nov');
  await updateHeroSetting('admin','schedule','aim',undefined,undefined,'previous_year');
  assert.equal((await getHeroSchedule()).find(m => m.id === 'aim').next.id,'aim-nov-previous');
  await updateHeroSetting('admin','schedule','aim',undefined,undefined,'keep');
  assert.equal((await getHeroSchedule()).find(m => m.id === 'aim').next.id,'aim-archive');
  await updateHeroSetting('admin','schedule','aim',undefined,undefined,'automatic');
  assert.equal((await getHeroSchedule()).find(m => m.id === 'aim').next.id,'aim-nov-archive');
  await updateHeroSetting('admin','select','aim',undefined,'previous');
  assert.equal((await getHeroSchedule()).find(m => m.id === 'aim').live.id,'aim-nov-previous');
  await updateHeroSetting('admin','select','aim',undefined,'automatic');
  assert.equal((await getHeroSchedule()).find(m => m.id === 'aim').live.id,'aim-sep');
  assert.equal(isIssueMonthReleased(2026,11,new RealDate('2026-10-31T18:29:59.999Z')),false);
  assert.equal(isIssueMonthReleased(2026,11,new RealDate('2026-10-31T18:30:00.000Z')),true);
  await updateHeroSetting('admin','schedule','aim',undefined,undefined,'previous_year');
  current = '2026-10-31T18:30:00.000Z';
  assert.equal((await getHeroSchedule()).find(m => m.id === 'aim').live.id,'aim-nov-previous','next-month override goes live at midnight India time');
  assert.equal((await getLiveHeroIssueIds()).has('aim-nov-previous'),true,'scheduled hero receives the featured access rule');
  current = '2026-11-30T18:30:00.000Z';
  assert.equal((await getHeroSchedule()).find(m => m.id === 'aim').live.id,'aim-nov','one-month override expires after its month');
  current = '2026-10-31T18:30:00.000Z';
  await updateHeroSetting('admin','select','aim',undefined,'previous');
  assert.equal((await getHeroSchedule()).find(m => m.id === 'aim').live.id,'aim-sep','previous mode tracks the new automatic issue');
  console.log('PASS India-time rollover, archived next-month preview, scheduled override, multiple hides and dynamic hero choices.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.close());
