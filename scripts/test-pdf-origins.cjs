const assert=require('node:assert/strict');
const {validate,checkOrigins}=require('./check-pdf-origins.cjs');
(async()=>{
  const entry={label:'restricted fixture',kind:'restricted',url:'https://archive.example.org/old.pdf?v=1'};
  assert.equal(validate([entry]).length,1);
  for(const url of ['http://archive.example.org/a.pdf','https://user:secret@archive.example.org/a.pdf','https://archive.example.org/a.pdf?X-Amz-Signature=secret','https://archive.example.org/a.pdf#x','https://example.test/a.pdf'])assert.throws(()=>validate([{...entry,url}]));
  assert.throws(()=>validate([]));assert.throws(()=>validate([{...entry,kind:'released'}]));
  for(const status of [200,206,301,302,307,308,401,403,404,429,500,503]){
    let calls=0,cancelled=0;
    const report=await checkOrigins([entry],async(url,options)=>{
      calls++;assert.equal(options.redirect,'manual');assert.ok(options.signal);assert.equal(url,entry.url);
      if(calls===3)assert.equal(options.headers.Range,'bytes=0-4');else assert.equal(options.headers.Range,undefined);
      return new Response(options.method==='HEAD'?null:new ReadableStream({start(c){c.enqueue(Buffer.from('Denied'));},cancel(){cancelled++;}}),{status});
    });
    assert.equal(calls,3);assert.equal(cancelled,2);assert.equal(report.passed,[403,404].includes(status));
    assert.ok(!JSON.stringify(report).includes(entry.url));
  }
  const misleading=await checkOrigins([entry],async()=>new Response(null,{status:403,headers:{'Content-Type':'application/pdf'}}));assert.equal(misleading.passed,false);
  const hiddenPdf=await checkOrigins([entry],async()=>new Response('%PDF-',{status:404,headers:{'Content-Type':'application/octet-stream'}}));assert.equal(hiddenPdf.passed,false);
  const offline=await checkOrigins([entry],async()=>{throw new Error('private details');});assert.equal(offline.passed,false);assert.ok(!JSON.stringify(offline).includes('private details'));
  console.log('PASS origin verifier fails closed for success/partial bytes, redirects, outages, signed inputs and PDF-labelled errors; accepts only explicit 403/404, cancels bodies and redacts URLs. Synthetic transport only.');
})().catch(error=>{console.error(error);process.exitCode=1;});
