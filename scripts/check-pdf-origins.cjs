// Explicit, read-only cutover check. No credentials or environment files loaded.
const fs=require('node:fs');

function validate(entries) {
  if(!Array.isArray(entries)||!entries.length||entries.length>100)throw new Error('Supply 1–100 reviewed PDF origin entries');
  return entries.map(entry=>{
    const url=new URL(entry.url);
    if(url.protocol!=='https:'||url.username||url.password||url.hash)throw new Error('Each origin must be an unsigned HTTPS URL');
    if([...url.searchParams].some(([key,value])=>key!=='v'||!/^\d+$/.test(value)))throw new Error('Signed URLs and arbitrary query parameters are not permitted');
    if(!/\.pdf$/i.test(url.pathname)||!entry.label||!['restricted','draft','retired'].includes(entry.kind))throw new Error('Each entry needs a label, PDF path and restricted/draft/retired kind');
    if(url.hostname.endsWith('.test')||url.hostname.endsWith('.invalid'))throw new Error('Replace example hosts before the live check');
    return {...entry,url:url.href};
  });
}

async function checkOrigins(entries,fetcher=fetch,timeoutMs=15000) {
  const results=[];
  for(const entry of entries)for(const probe of [{method:'HEAD'},{method:'GET'},{method:'GET',range:'bytes=0-4'}]){
    const {method,range}=probe;
    let result={label:entry.label,kind:entry.kind,method,...(range?{range}:{}),passed:false};
    try{
      const response=await fetcher(entry.url,{
        method,redirect:'manual',cache:'no-store',referrerPolicy:'no-referrer',
        headers:{'Cache-Control':'no-cache',...(range?{Range:range}:{})},
        signal:AbortSignal.timeout(timeoutMs),
      });
      // A redirect, outage, authentication challenge or apparent success isn't verified denial.
      // MIME also prevents certifying an error response that is still labelled as a PDF.
      result.status=response.status;
      result.passed=[403,404].includes(response.status)&&!/^application\/pdf\b/i.test(response.headers.get('content-type')||'');
      if(response.body){
        if(result.passed){
          const reader=response.body.getReader();let prefix=Buffer.alloc(0);
          try{
            while(prefix.length<5){
              const {done,value}=await reader.read();if(done)break;
              prefix=Buffer.concat([prefix,Buffer.from(value).subarray(0,5-prefix.length)]);
            }
            if(prefix.toString('ascii')==='%PDF-')result.passed=false;
          }finally{await reader.cancel();reader.releaseLock();}
        }else await response.body.cancel();
      }
    }catch{result.error='Request failed or timed out; denial unverified';result.passed=false;}
    results.push(result);
  }
  return {checkedAt:new Date().toISOString(),passed:results.every(result=>result.passed),results};
}

if(require.main===module){
  (async()=>{
    const index=process.argv.indexOf('--manifest');
    if(index<0||!process.argv[index+1])throw new Error('Usage: node scripts/check-pdf-origins.cjs --manifest <private-reviewed-origin-list.json>');
    const entries=validate(JSON.parse(fs.readFileSync(process.argv[index+1],'utf8')));
    const report=await checkOrigins(entries);
    // URLs, query strings and response bodies are deliberately excluded from output.
    console.log(JSON.stringify(report,null,2));
    if(!report.passed)process.exitCode=1;
  })().catch(()=>{console.error('Origin check could not run. Check the manifest format and unsigned HTTPS PDF URLs.');process.exitCode=1;});
}
module.exports={validate,checkOrigins};
