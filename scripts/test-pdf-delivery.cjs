const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const fixtures = require('./fixtures/pdf-access.cjs');
process.env.R2_PUBLIC_BASE_URL = fixtures.currentBase;
process.env.R2_LEGACY_PUBLIC_BASE_URLS = fixtures.formerBase;
global.fetch = async () => { throw new Error('No network allowed'); };
const { root, fromWeb } = require('./register-web-typescript.cjs');
const db = new DatabaseSync(':memory:');
db.exec(fs.readFileSync(path.join(root, 'packages/turso/migrations/00001_initial_schema.sql'), 'utf8'));
db.prepare('INSERT INTO magazines(id,name,created_at,updated_at) VALUES(?,?,?,?)').run('fixture-magazine','Synthetic',fixtures.now,fixtures.now);
for (const i of fixtures.issues) db.prepare('INSERT INTO issues(id,magazine_id,title,year,month,is_published,pdf_url,cover_image_url,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)')
  .run(i.id,i.magazine_id,i.title,i.year,i.month,i.is_published,i.pdf_url,i.cover_image_url,fixtures.now,fixtures.now);
db.prepare('INSERT INTO admins (id,email,name,created_at) VALUES(?,?,?,?)').run('test-admin','admin@example.test','Synthetic admin',fixtures.now);
require('../apps/web/src/lib/db/client.ts').getDb = () => ({ execute: async ({sql,args}) => ({rows: db.prepare(sql).all(...args)}) });
let authenticated = false;
require('../apps/web/src/lib/admin-auth.ts').verifyAdmin = async () => authenticated ? {id:'test-admin',email:'admin@example.test',name:'Synthetic admin'} : null;
const { createPdfDelivery } = require('../apps/web/src/lib/pdf-delivery.ts');
const { pdfKeyFromLocator } = require('../apps/web/src/lib/pdf-access.ts');
const { S3Client } = fromWeb('@aws-sdk/client-s3');
const client = new S3Client({ region:'auto', endpoint:'https://account.example.test', credentials:{accessKeyId:'fixture',secretAccessKey:'fixture-secret'} });
const objects = fixtures.createObjects();
let headHook = null, calls = [], cancelled = false, clock = new Date(fixtures.now);
client.send = async (command, options) => {
  calls.push(command);
  assert.ok(options.abortSignal);
  const object = objects.get(command.input.Key);
  if (!object) throw {$metadata:{httpStatusCode:404}};
  const headers = {ContentLength:object.body.length, ContentType:object.contentType, ETag:'"fixture"'};
  if (command.constructor.name === 'HeadObjectCommand') { if(headHook) await headHook(); return headers; }
  let bytes = object.body;
  if(command.input.Range) {const [,a,b]=/bytes=(\d+)-(\d+)/.exec(command.input.Range);bytes=bytes.subarray(Number(a),Number(b)+1);}
  const contentRange=command.input.Range ? `${command.input.Range.replace('=', ' ')}/${object.body.length}` : undefined;
  return {...headers, ContentLength:bytes.length, ContentRange:contentRange, Body:{transformToWebStream:()=>{
    let sent=false;
    return new ReadableStream({pull(c){if(sent)c.close();else{sent=true;c.enqueue(new Uint8Array(bytes));}},cancel(){cancelled=true;}},{highWaterMark:0});
  }}};
};
let featuredId = null;
const handle = createPdfDelivery({client:()=>client,bucket:()=> 'fixture-bucket',now:()=>clock,featured:async(id)=>id===featuredId});
const request = (id,mode='grant',method='GET',headers={}) => handle(new Request('https://site.example.test/api',{method,headers}),id,mode);
function cacheSafe(response) {assert.match(response.headers.get('Cache-Control'),/private, no-store/);assert.equal(response.headers.get('Vercel-CDN-Cache-Control'),'no-store');}
// Independent SigV4 verification: catches changed object/method/query and expiry.
function signatureValid(raw, method, at) {
  const url=new URL(raw), q=url.searchParams, date=q.get('X-Amz-Date');
  const issued=Date.parse(`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T${date.slice(9,11)}:${date.slice(11,13)}:${date.slice(13,15)}Z`);
  if(at.getTime()<issued || at.getTime()>=issued+Number(q.get('X-Amz-Expires'))*1000)return false;
  const signature=q.get('X-Amz-Signature');q.delete('X-Amz-Signature');
  const enc=s=>encodeURIComponent(s).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
  const query=[...q].map(([k,v])=>[enc(k),enc(v)]).sort(([a,b],[c,d])=>a<c?-1:a>c?1:b<d?-1:b>d?1:0).map(([k,v])=>`${k}=${v}`).join('&');
  const scope=q.get('X-Amz-Credential').split('/').slice(1).join('/');
  const canonical=[method,url.pathname,query,`host:${url.host}\n`,'host','UNSIGNED-PAYLOAD'].join('\n');
  const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
  const hmac=(k,v)=>crypto.createHmac('sha256',k).update(v).digest();
  let key=Buffer.from('AWS4fixture-secret');for(const part of scope.split('/'))key=hmac(key,part);
  return hmac(key,['AWS4-HMAC-SHA256',date,scope,hash(canonical)].join('\n')).toString('hex')===signature;
}
(async()=>{
  process.env.PDF_DELIVERY_DISABLED='1';
  for(const mode of ['grant','public','download','admin'])for(const method of ['GET','HEAD']){
    calls=[];const response=await request(fixtures.issues[0].id,mode,method);
    assert.equal(response.status,503);cacheSafe(response);assert.equal(calls.length,0);assert.equal(response.headers.get('location'),null);
    if(method==='HEAD')assert.equal(await response.text(),'');
  }
  delete process.env.PDF_DELIVERY_DISABLED;
  // Full method/mode matrix: an admin cookie must not elevate public endpoints.
  for (const signedIn of [false,true]) {
    authenticated=signedIn;
    for (const issue of fixtures.issues) for (const mode of ['grant','public','download','admin']) for (const method of ['GET','HEAD']) {
      calls=[];
      const response=await request(issue.id,mode,method,{range:'bytes=0-4'});
      const allowed=mode==='admin' ? signedIn : issue.expected.publicPdf;
      const expected=mode==='admin'&&!signedIn ? 401 : !allowed ? 404 : mode==='admin' ? (method==='HEAD'?200:206) : mode==='grant'?200:307;
      assert.equal(response.status,expected,`${signedIn}/${issue.name}/${mode}/${method}`);cacheSafe(response);
      if(!allowed){assert.equal(calls.length,0);assert.equal(response.headers.get('location'),null);}
      if(method==='HEAD')assert.equal(await response.text(),'');else if(response.body)await response.body.cancel();
    }
  }
  authenticated=false;
  const featuredIssue = fixtures.issues.find(issue => issue.name === 'restricted');
  featuredId = featuredIssue.id;
  assert.equal((await request(featuredIssue.id, 'public')).status, 307, 'featured published issue permits current PDF access');
  featuredId = null;
  assert.equal((await request(featuredIssue.id, 'public')).status, 404, 'removing hero selection restores the embargo');
  db.prepare('UPDATE issues SET year=2026,month=11 WHERE id=?').run(featuredIssue.id);
  featuredId = featuredIssue.id;
  assert.equal((await request(featuredIssue.id, 'public')).status, 404, 'future issue remains private even if selected as hero');
  db.prepare('UPDATE issues SET year=?,month=? WHERE id=?').run(featuredIssue.year,featuredIssue.month,featuredIssue.id);
  featuredId = null;
  for(const i of fixtures.issues){
    calls=[];const r=await request(i.id);cacheSafe(r);assert.equal(r.status,i.expected.publicPdf?200:404);
    if(!i.expected.publicPdf)assert.equal(calls.length,0);
  }
  const released=fixtures.issues[0], restricted=fixtures.issues[1];
  const grant=await (await request(released.id)).json();
  assert.equal(new Date(grant.expires_at)-clock,300000);
  assert.equal(new URL(grant.url).searchParams.get('response-cache-control'),'private, no-store, max-age=0');
  assert.ok(signatureValid(grant.url,'GET',clock));
  assert.equal(signatureValid(grant.url,'HEAD',clock),false);
  assert.equal(signatureValid(grant.url.replace('released.pdf','restricted.pdf'),'GET',clock),false);
  assert.equal(signatureValid(grant.url.replace('X-Amz-Expires=300','X-Amz-Expires=600'),'GET',clock),false);
  assert.equal(signatureValid(grant.url,'GET',new Date(clock.getTime()+300000)),false);
  assert.ok(signatureValid(grant.url,'GET',new Date(clock.getTime()+299999)));
  assert.equal(signatureValid(grant.url,'GET',new Date(clock.getTime()-1)),false);
  const changedHost=new URL(grant.url);changedHost.hostname='other.example.test';assert.equal(signatureValid(changedHost.href,'GET',clock),false);
  const changedDisposition=new URL(grant.url);changedDisposition.searchParams.set('response-content-disposition','attachment');assert.equal(signatureValid(changedDisposition.href,'GET',clock),false);
  const changedSignature=new URL(grant.url);changedSignature.searchParams.set('X-Amz-Signature','0'.repeat(64));assert.equal(signatureValid(changedSignature.href,'GET',clock),false);
  // Issued grants have the documented five-minute lifetime, even after unpublishing.
  db.prepare('UPDATE issues SET is_published=0 WHERE id=?').run(released.id);
  assert.equal((await request(released.id)).status,404);
  assert.ok(signatureValid(grant.url,'GET',new Date(clock.getTime()+1000)));
  assert.equal(signatureValid(grant.url,'GET',new Date(clock.getTime()+300000)),false);
  db.prepare('UPDATE issues SET is_published=1 WHERE id=?').run(released.id);
  // Former-origin locators authorize by catalogue state; never redirect to that origin.
  for(const issue of fixtures.issues){
    db.prepare('UPDATE issues SET pdf_url=? WHERE id=?').run(issue.pdf_url.replace(fixtures.currentBase,fixtures.formerBase),issue.id);
    const response=await request(issue.id,'public');assert.equal(response.status,issue.expected.publicPdf?307:404);
    if(issue.expected.publicPdf)assert.equal(new URL(response.headers.get('location')).hostname,'fixture-bucket.account.example.test');
    db.prepare('UPDATE issues SET pdf_url=? WHERE id=?').run(issue.pdf_url,issue.id);
  }
  const h=await request(released.id,'public','HEAD');assert.equal(h.status,307);cacheSafe(h);
  assert.ok(signatureValid(h.headers.get('location'),'HEAD',clock));
  for(const id of fixtures.adversarial.ids){calls=[];const r=await request(id);assert.equal(r.status,404);assert.equal(calls.length,0);}
  for(const locator of fixtures.adversarial.locators)assert.equal(pdfKeyFromLocator(locator),null,locator);
  assert.equal(pdfKeyFromLocator(`${fixtures.formerBase}/fixtures/a%20b.pdf?v=123`),'fixtures/a b.pdf');
  for(const locator of fixtures.adversarial.locators){db.prepare('UPDATE issues SET pdf_url=? WHERE id=?').run(locator,released.id);calls=[];assert.equal((await request(released.id)).status,404);assert.equal(calls.length,0);}
  db.prepare('UPDATE issues SET pdf_url=? WHERE id=?').run(released.pdf_url,released.id);
  assert.equal((await request(restricted.id,'admin')).status,401);
  authenticated=true;
  const full=await request(restricted.id,'admin');assert.equal(full.status,200);
  assert.deepEqual(Buffer.from(await full.arrayBuffer()),objects.get('fixtures/restricted.pdf').body);
  for(const i of fixtures.issues){const r=await request(i.id,'admin','HEAD');assert.equal(r.status,200);cacheSafe(r);assert.equal(await r.text(),'');}
  const range=await request(restricted.id,'admin','GET',{range:'bytes=0-4'});assert.equal(range.status,206);assert.equal(range.headers.get('content-length'),'5');
  const reader=range.body.getReader();assert.equal(Buffer.from((await reader.read()).value).toString(),'%PDF-');await reader.cancel();assert.equal(cancelled,true);
  for(const range of ['bytes=999999-','bytes=0-1,4-5','garbage','bytes=-0','bytes=6-3']){
    calls=[];const r=await request(restricted.id,'admin','GET',{range});assert.equal(r.status,416);cacheSafe(r);assert.equal(calls.length,1);
  }
  for(const range of ['bytes=5-','bytes=-8']){const r=await request(restricted.id,'admin','GET',{range});assert.equal(r.status,206);await r.body.cancel();}
  const mismatch=await request(restricted.id,'admin','GET',{range:'bytes=0-4','if-range':'"old"'});assert.equal(mismatch.status,200);await mismatch.body.cancel();
  db.prepare('DELETE FROM admins').run();assert.equal((await request(restricted.id,'admin')).status,401);
  headHook=()=>db.prepare('UPDATE issues SET is_published=0 WHERE id=?').run(released.id);
  assert.equal((await request(released.id)).status,404);headHook=null;
  db.prepare('UPDATE issues SET is_published=1 WHERE id=?').run(released.id);
  headHook=()=>db.prepare('UPDATE issues SET pdf_url=? WHERE id=?').run(fixtures.issues[1].pdf_url,released.id);
  assert.equal((await request(released.id)).status,404);headHook=null;
  db.prepare('UPDATE issues SET pdf_url=? WHERE id=?').run(released.pdf_url,released.id);
  for(const b of fixtures.boundaryCases){
    clock=new Date(b.at);
    for(const mode of ['grant','public','download'])for(const method of ['GET','HEAD']){
      const response=await request(fixtures.issues[4].id,mode,method);
      assert.equal(response.status,b.embargoed?404:mode==='grant'?200:307);cacheSafe(response);
      if(method==='HEAD')assert.equal(await response.text(),'');
    }
  }
  clock=new Date(fixtures.now);
  const object=objects.get('fixtures/released.pdf');objects.delete('fixtures/released.pdf');assert.equal((await request(released.id)).status,404);
  objects.set('fixtures/released.pdf',{...object,contentType:'text/html'});assert.equal((await request(released.id)).status,404);
  objects.set('fixtures/released.pdf',object);
  require('../apps/web/src/lib/pdf-delivery.ts').deliverPdf=handle;
  // Rate-limit behavior has its own shared-bucket regression; keep this fixture focused on PDF authorization.
  require('../apps/web/src/lib/rate-limit.ts').publicRateLimit=async()=>null;
  const accessRoute=require('../apps/web/src/app/api/issues/[id]/access/route.ts');
  const publicRoute=require('../apps/web/src/app/api/issues/[id]/pdf/route.ts');
  const adminRoute=require('../apps/web/src/app/api/admin/issues/[id]/pdf/route.ts');
  const context={params:Promise.resolve({id:released.id})};
  assert.equal((await accessRoute.GET(new Request('https://site.example.test'),context)).status,200);
  assert.equal((await publicRoute.HEAD(new Request('https://site.example.test',{method:'HEAD'}),context)).status,307);
  assert.equal((await adminRoute.GET(new Request('https://site.example.test'),context)).status,401);
  const next=fromWeb('next/server'),pending=[];
  next.after=callback=>pending.push(callback());
  const downloadRoute=require('../apps/web/src/app/api/issues/[id]/download/route.ts');
  const downloaded=await downloadRoute.GET(new next.NextRequest('https://site.example.test'),context);
  assert.equal(downloaded.status,307);cacheSafe(downloaded);
  assert.match(new URL(downloaded.headers.get('location')).searchParams.get('response-content-disposition'),/^attachment;/);
  await Promise.all(pending);
  assert.equal(db.prepare('SELECT download_count FROM issues WHERE id=?').get(released.id).download_count,1);
  await downloadRoute.HEAD(new next.NextRequest('https://site.example.test',{method:'HEAD'}),context);
  assert.equal(db.prepare('SELECT download_count FROM issues WHERE id=?').get(released.id).download_count,1);
  assert.equal((await downloadRoute.GET(new next.NextRequest('https://site.example.test'),{params:Promise.resolve({id:restricted.id})})).status,404);
  assert.equal(db.prepare('SELECT download_count FROM issues WHERE id=?').get(restricted.id).download_count,0);
  client.send=async()=>{throw new Error('private credentials must never appear');};const failed=await request(released.id);assert.equal(failed.status,503);cacheSafe(failed);assert.doesNotMatch(await failed.text(),/credentials/);
  console.log('PASS actual delivery handler with fresh SQLite reads, six access states, removed admin, ranges/cancellation, publication/replacement races, locator attacks, missing objects, safe errors/cache headers and independently verified GET/HEAD signatures/expiry. No remote requests.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{db.close();client.destroy();});
