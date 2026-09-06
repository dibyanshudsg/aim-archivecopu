// Isolated, real libSQL transaction checks. Never loads environment credentials.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
const fromWeb = Module.createRequire(path.join(root, 'apps/web/package.json'));
const ts = fromWeb('typescript');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, parent, ...args) {
  if (name.startsWith('@/')) name = path.join(root, 'apps/web/src', name.slice(2));
  return resolve.call(this, name, parent, ...args);
};
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, file);
const db = fromWeb('@libsql/client').createClient({url:'file::memory:'});
require('../apps/web/src/lib/db/client.ts').getDb = () => db;
const { indexIssue, indexIssueFromUrl, indexIssueFromBuffer, canIndexIssue } = require('../apps/web/src/lib/search-indexer.ts');
(async()=>{
  try {
    await db.executeMultiple(`CREATE TABLE magazines(id TEXT PRIMARY KEY,language TEXT);
      INSERT INTO magazines VALUES('aim','english'),('agni','hindi');
      CREATE TABLE issues(id TEXT PRIMARY KEY,page_count INTEGER,updated_at TEXT,magazine_id TEXT);
      CREATE TABLE issue_search_index(id TEXT PRIMARY KEY,issue_id TEXT,page_number INTEGER,content TEXT,created_at TEXT);
      INSERT INTO issues VALUES('pilot',2,'before','aim'),('hindi',28,'before','agni');
      INSERT INTO issue_search_index VALUES('old','pilot',1,'previous searchable text','before');
      INSERT INTO issue_search_index VALUES('old-hindi','hindi',3,'existing Hindi index retained','before');`);
    const snapshot = async()=>JSON.stringify((await db.execute('SELECT * FROM issue_search_index')).rows);
    const before = await snapshot();
    assert.equal(await canIndexIssue('pilot'),true);
    assert.equal(await canIndexIssue('hindi'),false);
    assert.equal(await canIndexIssue('missing'),false);
    assert.equal(await indexIssueFromUrl('hindi','not-a-valid-url'),0,'Hindi must skip before downloading');
    assert.equal(await indexIssueFromBuffer('hindi',Buffer.from('not a PDF')),0,'Hindi must skip before extraction');
    assert.equal(await indexIssue('hindi',{totalPages:28,pages:[{pageNumber:1,content:'must not write'}]}),0);
    assert.equal(await snapshot(),before);
    await assert.rejects(indexIssue('pilot',{totalPages:5,pages:[]}),/No searchable text/);
    await assert.rejects(indexIssue('pilot',{totalPages:0,pages:[]}),/page count/);
    await assert.rejects(indexIssue('pilot',{totalPages:5,pages:[{pageNumber:6,content:'invalid'}]}),/out-of-range/);
    await assert.rejects(indexIssue('pilot',{totalPages:5,pages:[{pageNumber:1,content:'a'},{pageNumber:1,content:'b'}]}),/duplicate/);
    assert.equal(await snapshot(),before);
    await assert.rejects(indexIssue('pilot',{version:'test',totalPages:5,pages:[{pageNumber:1,content:'incomplete'}]}),/every physical page/);
    await assert.rejects(indexIssue('pilot',{version:'test',totalPages:6,pages:Array.from({length:6},(_,i)=>({pageNumber:i+1,content:i?'':'reliable text',status:i?'review':'approved'}))}),/uncertain pages/);
    assert.equal(await snapshot(),before,'Incomplete or uncertain extraction must retain the previous index');
    await db.execute(`CREATE TRIGGER fail_index BEFORE INSERT ON issue_search_index BEGIN SELECT RAISE(ABORT,'injected write failure'); END`);
    await assert.rejects(indexIssue('pilot',{totalPages:5,pages:[{pageNumber:4,content:'new text'}]}),/injected write failure/);
    assert.equal(await snapshot(),before,'Failed replacement must roll back DELETE');
    assert.equal((await db.execute("SELECT page_count FROM issues WHERE id='pilot'")).rows[0].page_count,2);
    await db.execute('DROP TRIGGER fail_index');
    assert.equal(await indexIssue('pilot',{totalPages:5,pages:[{pageNumber:2,content:'first text page'},{pageNumber:4,content:'second text page'},{pageNumber:5,content:'  '}]}),2);
    assert.equal((await db.execute("SELECT page_count FROM issues WHERE id='pilot'")).rows[0].page_count,5,'Physical count includes blank pages');
    assert.deepEqual((await db.execute("SELECT page_number FROM issue_search_index WHERE issue_id='pilot' ORDER BY page_number")).rows.map(r=>r.page_number),[2,4]);
    assert.equal((await db.execute("SELECT content FROM issue_search_index WHERE issue_id='hindi'")).rows[0].content,'existing Hindi index retained');
    assert.equal(await indexIssue('pilot',{version:'test',totalPages:3,pages:[
      {pageNumber:1,content:'Reliable matching passage',status:'approved'},
      {pageNumber:2,content:'Uncertain text must not become searchable',status:'review'},
      {pageNumber:3,content:'',status:'empty'},
    ]}),1);
    assert.deepEqual((await db.execute("SELECT page_number FROM issue_search_index WHERE issue_id='pilot'")).rows.map(r=>r.page_number),[1]);
    assert.equal((await db.execute("SELECT page_count FROM issues WHERE id='pilot'")).rows[0].page_count,3);
    console.log('PASS: English-only indexing skips Hindi before download/extraction/write; invalid/empty extraction retains index; injected write failure rolls back; physical page count and original page numbers preserved.');
  } finally {db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
