// Actual private reader, presign/completion routes and database transactions; fake R2 only.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const fixtures = require('./fixtures/pdf-access.cjs');
process.env.R2_PUBLIC_BASE_URL = fixtures.currentBase;
process.env.R2_LEGACY_PUBLIC_BASE_URLS = '';
process.env.R2_ACCOUNT_ID = 'fixture'; process.env.R2_BUCKET = 'fixture';
process.env.R2_ACCESS_KEY_ID = 'fixture'; process.env.R2_SECRET_ACCESS_KEY = 'fixture';
process.env.ADMIN_SESSION_SECRET = 'isolated-test-only';
global.fetch = async () => { throw new Error('Unexpected network'); };
const { root, fromWeb } = require('./register-web-typescript.cjs');
const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'aim-private-maintenance-'));
const db = fromWeb('@libsql/client').createClient({ url: 'file:' + path.join(dir, 'test.db').replace(/\\/g, '/') });
require('../apps/web/src/lib/db/client.ts').getDb = () => db;
let authenticated = true;
const admin = { id: 'test-admin', email: 'admin@example.test', name: 'Test' };
require('../apps/web/src/lib/admin-auth.ts').verifyAdmin = async () => authenticated ? admin : null;
require('../apps/web/src/lib/public-cache.ts').refreshPublicArchiveCaches = () => {};
const r2 = require('../apps/web/src/lib/r2-client.ts');
const objects = fixtures.createObjects();
let calls = [], metadata = {}, failCopy = false, race = null;
r2.getR2Client().send = async command => {
  calls.push(command); const { Key, Range } = command.input;
  if (command.constructor.name === 'CopyObjectCommand') {
    if (failCopy) throw new Error('synthetic storage failure');
    const src = command.input.CopySource.slice('fixture/'.length);
    if (!objects.has(src)) throw new Error('missing stage');
    objects.set(Key, { ...objects.get(src), body: Buffer.from(objects.get(src).body) });
    if (race) await race();
    return {};
  }
  if (command.constructor.name === 'DeleteObjectCommand') { objects.delete(Key); return {}; }
  const object = objects.get(Key); if (!object) throw new Error('missing object');
  const body = Range ? object.body.subarray(0,5) : object.body;
  return { ContentLength: object.body.length, ContentType: object.contentType, ...metadata,
    Body: { transformToWebStream: () => new Response(body).body, transformToByteArray: async () => body } };
};
const { readPrivatePdf } = require('../apps/web/src/lib/private-pdf.ts');
const { replacementTicket, verifyReplacementTicket } = require('../apps/web/src/lib/replacement-upload.ts');
const repo = require('../apps/web/src/lib/db/admin-repository.ts');
const { POST: presign } = require('../apps/web/src/app/api/admin/upload/presign/route.ts');
const { POST: replace } = require('../apps/web/src/app/api/admin/issues/[id]/pdf/route.ts');
const post = data => new Request('https://site.example.test', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
const query = (sql,args=[]) => db.execute({sql,args});
const pdf = objects.get('fixtures/released.pdf').body;
let issue;
async function prepare() {
  const response = await presign(post({ issue_id: issue.id, content_type: 'application/pdf', size: pdf.length, filename: 'replacement.pdf' }));
  assert.equal(response.status,200); assert.match(response.headers.get('cache-control'),/no-store/);
  const data = await response.json();
  const proof = verifyReplacementTicket(data.uploadTicket,admin.id,issue.id); assert.ok(proof);
  objects.set(proof.key,{body:pdf,contentType:'application/pdf'});
  return { ...data, proof };
}
const complete = ticket => replace(post({uploadTicket:ticket}),{params:Promise.resolve({id:issue.id})});
(async () => {
  for (const name of fs.readdirSync(path.join(root,'packages/turso/migrations')).filter(n=>n.endsWith('.sql')).sort()) {
    await db.executeMultiple(fs.readFileSync(path.join(root,'packages/turso/migrations',name),'utf8'));
  }
  await query("INSERT INTO magazines(id,name,language,created_at,updated_at) VALUES('fixture-magazine','Synthetic','english','now','now')");
  await query('INSERT INTO admins VALUES(?,?,?,?)',[admin.id,admin.email,admin.name,'now']);
  issue = await repo.createAdminIssueInDb({magazine_id:'fixture-magazine',title:'Synthetic replacement',theme:null,year:2020,month:1,description:null,topics:[],pdf_url:fixtures.issues[0].pdf_url,cover_image_url:fixtures.issues[0].cover_image_url,file_size_bytes:pdf.length,is_published:false});
  assert.deepEqual(await readPrivatePdf(issue.pdf_url),pdf);
  for (const url of fixtures.adversarial.locators) { const before=calls.length; await assert.rejects(readPrivatePdf(url)); assert.equal(calls.length,before); }
  for (const override of [{ContentLength:101*1024*1024},{ContentLength:pdf.length+1},{ContentType:'text/html'}]) {
    metadata=override; await assert.rejects(readPrivatePdf(issue.pdf_url),/Private PDF read failed/);
  }
  metadata={};
  objects.set('fixtures/bad.pdf',{body:Buffer.from('HTMLbad'),contentType:'application/pdf'});
  await assert.rejects(readPrivatePdf(fixtures.currentBase+'/fixtures/bad.pdf'));
  const cover = require('../apps/web/src/lib/cover-delivery.ts').deliverCover;
  const coverRequest = () => cover(new Request('https://site.example.test'),issue.id,false,true);
  assert.equal((await coverRequest()).status,200,'Draft cover is available to current admin');
  authenticated=false; const before=calls.length; assert.equal((await coverRequest()).status,401); assert.equal(calls.length,before);
  assert.equal((await presign(post({issue_id:issue.id}))).status,401);
  authenticated=true;
  const upload=await prepare();
  assert.equal(verifyReplacementTicket(upload.uploadTicket, 'another-admin',issue.id),null);
  assert.equal(verifyReplacementTicket(upload.uploadTicket,admin.id,'another-issue'),null);
  assert.equal(verifyReplacementTicket(upload.uploadTicket+'tampered',admin.id,issue.id),null);
  const now=Date.now; Date.now=()=>now()+31*60_000;
  assert.equal(verifyReplacementTicket(upload.uploadTicket,admin.id,issue.id),null); Date.now=now;
  assert.equal((await complete('invalid')).status,400);
  failCopy=true; assert.equal((await complete(upload.uploadTicket)).status,502); failCopy=false;
  assert.equal((await query('SELECT pdf_url FROM issues WHERE id=?',[issue.id])).rows[0].pdf_url,issue.pdf_url);
  objects.set(upload.proof.key,{body:Buffer.from('invalid pdf'),contentType:'application/pdf'});
  assert.equal((await complete(upload.uploadTicket)).status,502);
  objects.set(upload.proof.key,{body:pdf,contentType:'application/pdf'});
  await query("INSERT INTO issue_search_index(id,issue_id,page_number,content,created_at) VALUES('old-text',?,1,'original text','now')",[issue.id]);
  const response=await complete(upload.uploadTicket); assert.equal(response.status,200); const saved=await response.json();
  assert.equal(saved.indexing,'queued'); assert.ok(saved.pdf_url.includes('-revision-')); assert.ok(!saved.pdf_url.includes('staging/'));
  assert.ok(objects.has('fixtures/released.pdf'),'Old PDF retained'); assert.ok(!objects.has(upload.proof.key),'Staging object cleaned');
  assert.equal((await query('SELECT * FROM issue_search_index WHERE issue_id=?',[issue.id])).rows.length,0);
  assert.equal((await complete(upload.uploadTicket)).status,409,'Ticket replay cannot replace a later source');
  const concurrent=await prepare();
  race=async()=>query('UPDATE issues SET pdf_url=? WHERE id=?',[fixtures.issues[1].pdf_url,issue.id]);
  assert.equal((await complete(concurrent.uploadTicket)).status,409); race=null;
  assert.equal((await query('SELECT pdf_url FROM issues WHERE id=?',[issue.id])).rows[0].pdf_url,fixtures.issues[1].pdf_url);
  await assert.rejects(repo.updateIssuePdfInDb(issue.id,saved.pdf_url,pdf.length,'wrong-source'),/PDF_SOURCE_CHANGED/);
  // Cover edits made after a replacement began must survive the replacement commit.
  await query("UPDATE issues SET cover_image_url='editor-cover' WHERE id=?",[issue.id]);
  await repo.updateIssuePdfInDb(issue.id,saved.pdf_url,pdf.length,fixtures.issues[1].pdf_url,{previous:issue.cover_image_url,next:'generated-cover'});
  assert.equal((await query('SELECT cover_image_url FROM issues WHERE id=?',[issue.id])).rows[0].cover_image_url,'editor-cover');
  // Exercise the worker's default authenticated transport, retaining the raw locator and byte hash.
  const {processNextIndexingJob}=require('../apps/web/src/lib/indexing-worker.ts');
  await processNextIndexingJob({extract:async bytes=>{
    assert.deepEqual(bytes,pdf);
    return {version:'test',totalPages:1,pages:[{pageNumber:1,content:'Synthetic searchable text',status:'approved'}]};
  }});
  const job=(await query('SELECT * FROM indexing_jobs WHERE issue_id=?',[issue.id])).rows[0];
  assert.equal(job.status,'complete'); assert.equal(job.pdf_url,saved.pdf_url);
  assert.equal(job.source_hash,require('node:crypto').createHash('sha256').update(pdf).digest('hex'));
  await query('DELETE FROM admins WHERE id=?',[admin.id]);
  assert.equal((await coverRequest()).status,401,'Removed admin loses draft cover access');
  assert.ok(replacementTicket({adminId:admin.id,issueId:issue.id,source:issue.pdf_url,key:'staging/replacement-abc.pdf',size:pdf.length}));
  console.log('PASS authenticated private PDF reads, locator/type/size rejection, draft cover authorization/removal, replacement proof expiry/tampering/scope, storage failures, immutable promotion, old-file retention, replay/concurrency fencing and atomic index reset/cover preservation. No remote requests.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.close());
