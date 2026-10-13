// No credentials or filesystem assets needed: the retired route must never inspect a path.
const assert = require('node:assert/strict');
require('./register-web-typescript.cjs');
const route = require('../apps/web/src/app/api/pdf/[...path]/route.ts');
const fixtures = require('./fixtures/pdf-access.cjs');
const attacks = [
  ['..', 'outside.pdf'], ['..', 'AIM Project-other', 'secret.pdf'],
  ['%2e%2e', 'outside.pdf'], ['%252e%252e%252foutside.pdf'],
  ['..\\outside.pdf'], ['C:\\private\\secret.pdf'], ['\\\\server\\share\\secret.pdf'],
  ['/etc/secret.pdf'], ['link-to-outside', 'secret.pdf'], ['bad\0.pdf'],
  ['.env.local'], ['missing.pdf'], ['report.PDF'],
];
function denial(response) {
  assert.equal(response.status, 404);
  for (const header of ['cache-control','cdn-cache-control','vercel-cdn-cache-control']) assert.match(response.headers.get(header), /no-store/);
  assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  assert.equal(response.headers.get('content-disposition'),null);
  assert.equal(response.headers.get('location'),null);
  assert.equal(response.body,null);
}
(async()=>{
  for (const environment of ['production','development','test']) {
    process.env.NODE_ENV=environment;
    for (const segments of [...fixtures.issues.map(i=>['fixtures',i.name+'.pdf']),...attacks]) {
      for (const method of ['GET','HEAD']) {
        for (const range of [undefined,'bytes=0-4','bytes=-8','bytes=0-1,4-5']) {
          const request=new Request('https://site.example.test/api/pdf/fixture.pdf',{method,headers:{...(range?{Range:range}:{}),Cookie:'aim-admin-session=untrusted'}});
          denial(await route[method](request,{params:Promise.resolve({path:segments})}));
        }
      }
    }
    const context={get params(){throw new Error('Retired route inspected path parameters');}};
    denial(await route.GET(null,context));
  }
  assert.equal(route.dynamic,'force-dynamic');
  console.log('PASS retired local PDF route: all six catalogue states, traversal/absolute/sibling/symlink-like paths, GET/HEAD/ranges, all environments; empty uncached 404 without inspecting paths.');

  // Optional real Next production-server check. Only loopback is accepted.
  const argument=process.argv.find(arg=>arg.startsWith('--port='));
  if(!argument)return;
  const port=Number(argument.slice(7));
  assert.ok(Number.isInteger(port)&&port>0&&port<65536);
  const http=require('node:http');
  const paths=['released.pdf','restricted.pdf','draft.pdf','%2e%2e/outside.pdf','%252e%252e%252foutside.pdf','..%5coutside.pdf','C:%5cprivate%5csecret.pdf','link-to-outside/secret.pdf'];
  for(const path of paths)for(const method of ['GET','HEAD']){
    const result=await new Promise((resolve,reject)=>{
      const req=http.request({hostname:'127.0.0.1',port,path:'/api/pdf/'+path,method,headers:{Range:'bytes=0-4','Cache-Control':'no-cache'}},res=>{
        const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));
      });
      req.on('error',reject);req.setTimeout(5000,()=>req.destroy(new Error('Timed out')));req.end();
    });
    assert.equal(result.status,404,path);
    if(path==='%2e%2e/outside.pdf') {
      // Next normalizes this to /api/outside.pdf before matching our route.
      assert.match(result.headers['content-type']||'',/text\/html/);
      // Framework 404 HTML may be publicly cached; it contains no file bytes.
      assert.ok(!result.body.includes(Buffer.from('%PDF-')));
      if(method==='HEAD')assert.equal(result.body.length,0);
    } else {
      assert.equal(result.body.length,0,path);
      assert.match(result.headers['cache-control'],/no-store/);
    }
    assert.equal(result.headers['content-disposition'],undefined);
  }
  console.log('PASS production Next HTTP GET/HEAD/range and raw encoded-path denial (16 requests).');
})().catch(error=>{console.error(error);process.exitCode=1;});
