// Actual repositories and cover handler, synthetic in-memory database/storage only.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const fixtures=require('./fixtures/pdf-access.cjs');
// Keep the six publication/release expectations stable after the calendar advances.
const RealDate=Date;
global.Date=class extends RealDate {
  constructor(...args){super(...(args.length?args:[fixtures.now]));}
  static now(){return new RealDate(fixtures.now).getTime();}
};
process.env.R2_PUBLIC_BASE_URL=fixtures.currentBase;process.env.R2_LEGACY_PUBLIC_BASE_URLS='';
global.fetch=async()=>{throw new Error('Unexpected network');};
const {root}=require('./register-web-typescript.cjs');
const db=new DatabaseSync(':memory:');
db.exec(fs.readFileSync(path.join(root,'packages/turso/migrations/00001_initial_schema.sql'),'utf8'));
db.prepare('INSERT INTO magazines(id,name,language,cover_image_url,created_at,updated_at) VALUES(?,?,?,?,?,?)').run('fixture-magazine','Synthetic','english',fixtures.issues[0].cover_image_url,fixtures.now,fixtures.now);
for(const i of fixtures.issues)db.prepare('INSERT INTO issues(id,magazine_id,title,year,month,is_published,pdf_url,cover_image_url,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(i.id,i.magazine_id,i.title,i.year,i.month,i.is_published,i.pdf_url,i.cover_image_url,fixtures.now,fixtures.now);
require('../apps/web/src/lib/db/client.ts').getDb=()=>({execute:async statement=>{const {sql,args=[]}=typeof statement==='string'?{sql:statement}:statement;return {rows:db.prepare(sql).all(...args)};}});
const {createCoverDelivery}=require('../apps/web/src/lib/cover-delivery.ts');
const objects=fixtures.createObjects();let gets=0,hook=null,bodyOverride=null,sizeOverride=null;
const cover=createCoverDelivery({bucket:()=> 'fixture',client:()=>({send:async command=>{
  gets++;const object=objects.get(command.input.Key);if(!object)throw {$metadata:{httpStatusCode:404}};
  if(hook)hook();const body=bodyOverride??object.body;
  return {ContentType:object.contentType,ContentLength:sizeOverride??body.length,Body:{transformToWebStream:()=>new Response(body).body}};
}})});
const req=(id,magazine=false,method='GET')=>cover(new Request('https://site.example.test',{method}),id,magazine);
(async()=>{
  const repo=require('../apps/web/src/lib/db/public-repository.ts');
  const search=require('../apps/web/src/lib/db/search-repository.ts');
  const released=fixtures.issues[0],restricted=fixtures.issues[1];
  for(const issue of fixtures.issues){
    const result=await repo.getPublicIssueById(issue.id);
    if(!issue.is_published){assert.equal(result,null);continue;}
    assert.equal(result.pdf_url,issue.expected.publicPdf?`/api/issues/${issue.id}/pdf`:null);
    assert.equal(result.cover_image_url,`/api/issues/${issue.id}/cover`);
    assert.equal(result.magazines.cover_image_url,'/api/magazines/fixture-magazine/cover');
    assert.ok(!JSON.stringify(result).includes(fixtures.currentBase));
  }
  for(const rows of [await repo.listRecentPublicIssues(),await repo.listLatestEmbargoedIssues(),await repo.listHomeShelfIssues(),await search.searchIssueMetadata({query:'Synthetic',availability:'all'})])assert.ok(!JSON.stringify(rows).includes(fixtures.currentBase));
  for(const i of fixtures.issues){const response=await req(i.id);assert.equal(response.status,i.expected.publicCover?200:404);assert.match(response.headers.get('cache-control'),/no-store/);}
  assert.equal((await req('fixture-magazine',true)).status,200);
  assert.equal((await req(restricted.id,false,'HEAD')).headers.get('content-type'),'image/png');
  assert.equal(await (await req(restricted.id,false,'HEAD')).text(),'');
  gets=0;assert.equal((await req('../bad')).status,404);assert.equal(gets,0);
  hook=()=>db.prepare('UPDATE issues SET is_published=0 WHERE id=?').run(released.id);
  assert.equal((await req(released.id)).status,404);hook=null;
  db.prepare('UPDATE issues SET is_published=1 WHERE id=?').run(released.id);
  bodyOverride=Buffer.from('%PDF-pretending-to-be-an-image');assert.equal((await req(released.id)).status,404);bodyOverride=null;
  sizeOverride=5*1024*1024;assert.equal((await req(released.id)).status,404);sizeOverride=null;
  db.prepare('UPDATE issues SET cover_image_url=? WHERE id=?').run(released.pdf_url,released.id);assert.equal((await req(released.id)).status,404);
  const {fetchPublicPdf}=require('../apps/web/src/lib/public-pdf-fetch.ts');let requests=[];
  global.fetch=async(url,options)=>{requests.push({url,options});return new Response('pdf',{status:requests.length===1?403:200});};
  const stable=`/api/issues/${released.id}/pdf`;assert.equal((await fetchPublicPdf(stable)).status,200);assert.equal(requests.length,2);assert.ok(requests.every(r=>r.url===stable&&r.options.cache==='no-store'));
  requests=[];global.fetch=async()=>{requests.push(1);return new Response(null,{status:404});};assert.equal((await fetchPublicPdf(stable)).status,404);assert.equal(requests.length,1);
  await assert.rejects(fetchPublicPdf(released.pdf_url),/Unsupported/);
  const controller=new AbortController();controller.abort();await assert.rejects(fetchPublicPdf(stable,controller.signal),{name:'AbortError'});
  const store=new Map([['aim-reader-state-'+released.id,JSON.stringify({issueId:released.id,title:'Synthetic',magazineName:'Synthetic',coverImageUrl:released.cover_image_url,page:7,scale:1.5})]]);
  global.window={localStorage:{length:store.size,key:i=>[...store.keys()][i],getItem:k=>store.get(k)}};
  const entry=require('../apps/web/src/lib/reading-history.ts').getReadingHistory()[0];assert.equal(entry.coverImageUrl,`/api/issues/${released.id}/cover`);assert.equal(entry.page,7);assert.equal(entry.scale,1.5);
  console.log('PASS public DTOs/embargo/search/shelf routes, published versus draft cover gates, magazine covers, HEAD, raced unpublishing, PDF-as-image/size rejection, bounded renewal retries and saved position migration.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.close());
