// Isolated libSQL and mocked GitHub; never uses production credentials or workflows.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {root,fromWeb}=require('./register-web-typescript.cjs');
const dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'aim-controls-'));
const db=fromWeb('@libsql/client').createClient({url:'file:'+path.join(dir,'test.db').replace(/\\/g,'/')});
const context=new (require('node:async_hooks').AsyncLocalStorage)();
require('../apps/web/src/lib/db/client.ts').getDb=()=>context.getStore() || db;
const {EXTRACTION_VERSION}=require('../apps/web/src/lib/pdf-extract.ts');
const reviews=require('../apps/web/src/lib/db/indexing-page-reviews.ts');
const dispatch=require('../apps/web/src/lib/indexing-dispatch.ts');
const workspace=require('../apps/web/src/lib/db/indexing-workspace-repository.ts');
const jobs=require('../apps/web/src/lib/db/indexing-repository.ts');
const sql=(sql,args=[])=>db.execute({sql,args});
let postCount=0,mode='ok',run=null;
process.env.INDEXING_GITHUB_TOKEN='isolated-fake-token';
global.fetch=async(url,options)=>{
  if(options.method==='POST') {
    postCount++;
    if(mode==='reject') return new Response('{}',{status:403});
    const id=JSON.parse(options.body).inputs.request_id;
    run={id:123,status:'queued',conclusion:null,display_title:'Admin indexing '+id};
    if(mode==='timeout-no-run') {run=null;throw new Error('connection timeout');}
    if(mode==='timeout') throw new Error('connection timeout');
    return new Response(null,{status:204});
  }
  const u=new URL(url);
  if(u.pathname.endsWith('/runs/123'))return Response.json(run);
  return Response.json({workflow_runs:u.searchParams.has('status') ? (mode==='external'?[{...run,id:456}]:[]) : run?[run]:[]});
};
let month=0;
async function seed(id,language='english') {
  await sql(`INSERT INTO issues(id,magazine_id,title,year,month,pdf_url,page_count,is_published,created_at,updated_at) VALUES(?,?,?,2020,?,?,2,1,'now','now')`,[id,language,id,++month,'https://example.test/'+id+'.pdf']);
}
async function covered(id) {
  await sql(`INSERT INTO issue_search_index VALUES(?,?,2,'Article text stays intact','now')`,[id+'-page',id]);
  await sql(`INSERT INTO issue_indexing_coverage VALUES(?,?,?, ?,2,1,'[]','[1]','now','test')`,[id,'https://example.test/'+id+'.pdf','hash-'+id,EXTRACTION_VERSION]);
}
(async()=>{
  for(const file of ['00001_initial_schema.sql','00003_indexing_jobs.sql','00004_indexing_workspace.sql','00005_indexing_schedule.sql','00006_indexing_controls.sql']) {
    const schema=fs.readFileSync(path.join(root,'packages/turso/migrations',file),'utf8').replace(/CREATE INDEX IF NOT EXISTS idx_issue_search_content_fts\s+ON issue_search_index USING fts \(content\);/,'');
    await db.executeMultiple(schema);
  }
  await sql(`INSERT INTO magazines(id,name,language,created_at,updated_at) VALUES('english','AIM','english','now','now'),('hindi','Agni','hindi','now','now')`);
  await seed('review');await covered('review');await seed('hindi','hindi');
  assert.equal((await dispatch.getDispatchState()).pending,0);
  await assert.rejects(dispatch.startIndexing('admin'),/No eligible/);
  assert.equal(postCount,0,'Reviews and unsupported issues never trigger a worker');
  const input={issueId:'review',page:1,sourceHash:'hash-review',pdfUrl:'https://example.test/review.pdf',decision:'transcribe',content:'Descent of the Superman',note:'Verified against the cover'};
  await assert.rejects(reviews.resolvePageReview({...input,sourceHash:'old'},'admin'),/changed/);
  await reviews.resolvePageReview(input,'admin');
  assert.equal((await sql('SELECT content FROM issue_search_index WHERE id=?',['review-page'])).rows[0].content,'Article text stays intact');
  assert.equal((await workspace.getIndexingIssueDetails('review')).issue.status,'indexed');
  await assert.rejects(reviews.resolvePageReview(input,'other-admin'),/already/);
  assert.equal((await reviews.listPageReviews('review')).length,1);
  await seed('exclude');await covered('exclude');
  await db.executeMultiple("CREATE TRIGGER reject_review BEFORE UPDATE ON issue_indexing_coverage BEGIN SELECT RAISE(ABORT,'fixture rollback'); END;");
  await assert.rejects(reviews.resolvePageReview({...input,issueId:'exclude',sourceHash:'hash-exclude',pdfUrl:'https://example.test/exclude.pdf'},'admin'));
  assert.equal((await reviews.listPageReviews('exclude')).length,0,'A failed coverage write rolls back the audit and index together');
  assert.equal((await sql("SELECT COUNT(*) n FROM issue_search_index WHERE issue_id='exclude'")).rows[0].n,1);
  await db.executeMultiple('DROP TRIGGER reject_review;');
  await reviews.resolvePageReview({...input,issueId:'exclude',sourceHash:'hash-exclude',pdfUrl:'https://example.test/exclude.pdf',decision:'exclude',content:'ignored'},'admin');
  assert.equal((await workspace.getIndexingIssueDetails('exclude')).issue.indexed_pages,1);
  assert.equal((await workspace.getIndexingIssueDetails('exclude')).issue.status,'indexed');
  const document={version:EXTRACTION_VERSION,totalPages:2,pages:[{pageNumber:1,content:'',status:'review'},{pageNumber:2,content:'Article text stays intact',status:'approved'}]};
  const tx=await db.transaction('write');
  assert.equal((await reviews.applyPageReviews(tx,'review','hash-review',input.pdfUrl,document)).pages[0].content,input.content);
  assert.equal((await reviews.applyPageReviews(tx,'review','new-hash',input.pdfUrl,document)).pages[0].status,'review');
  await tx.commit();tx.close();
  await jobs.queueIssueIndexing('review');
  const job=await jobs.claimIndexingJob();await jobs.prepareIndexingCheckpoint(job,'hash-review',EXTRACTION_VERSION);
  await jobs.completeIndexingJob(job,document);
  assert.equal((await workspace.getIndexingIssueDetails('review')).issue.indexed_pages,2,'A real rebuild preserves verified text');
  await seed('missing');
  assert.equal((await dispatch.getDispatchState()).pending,1);
  const other=fromWeb('@libsql/client').createClient({url:'file:'+path.join(dir,'test.db').replace(/\\/g,'/')});
  const started=await Promise.allSettled([dispatch.startIndexing('admin'),context.run(other,()=>dispatch.startIndexing('other'))]);
  other.close();
  assert.equal(started.filter(r=>r.status==='fulfilled').length,1,'Only one simultaneous start succeeds');
  assert.equal(postCount,1);
  assert.equal((await sql(`SELECT COUNT(*) n FROM indexing_jobs WHERE status='queued'`)).rows[0].n,1,'Only the missing issue is queued');
  assert.equal((await dispatch.getDispatchState(true)).status,'waiting');
  run.status='in_progress';assert.equal((await dispatch.getDispatchState(true)).status,'running');
  run.status='completed';run.conclusion='success';assert.equal((await dispatch.getDispatchState(true)).active,false);
  mode='reject';await dispatch.startIndexing('admin');
  assert.equal((await dispatch.getDispatchState()).status,'start_failed');
  assert.equal((await sql(`SELECT status FROM indexing_jobs WHERE issue_id='missing'`)).rows[0].status,'queued');
  mode='timeout';await dispatch.startIndexing('admin');
  assert.equal((await dispatch.getDispatchState()).status,'unknown');
  const before=postCount;await assert.rejects(dispatch.startIndexing('other'),/already/);assert.equal(postCount,before);
  run.status='completed';run.conclusion='failure';assert.equal((await dispatch.getDispatchState(true)).status,'failed');
  mode='external';run.status='queued';await dispatch.startIndexing('admin');assert.equal(postCount,before,'An external waiting run is followed without another dispatch');
  await sql("UPDATE indexing_dispatches SET active=NULL,status='complete' WHERE active=1");
  mode='timeout-no-run';await dispatch.startIndexing('admin');
  await assert.rejects(dispatch.releaseUnconfirmedStart(),/Refresh/,'A fresh ambiguous request cannot be released immediately');
  await sql('UPDATE indexing_dispatches SET created_at=? WHERE active=1',[Date.now()-180000]);
  assert.equal((await dispatch.releaseUnconfirmedStart()).active,false,'An old unadmitted request can be released safely');
  console.log('PASS: source-fenced reviews, article preservation, stale/double-save rejection, unchanged-source rebuilds, no-op eligibility, concurrent starts, waiting/running/completion, explicit start failures, ambiguous timeout deduplication and external runs.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.close());
