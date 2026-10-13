// Read-only live preflight. No uploads, configuration writes or catalogue mutations.
// Prints sanitized results only: never URLs, signed query strings or credentials.
const {root,fromWeb}=require('./register-web-typescript.cjs');
const path=require('node:path');
process.loadEnvFile(path.join(root,'apps/web/.env.local'));
const {getDb}=require('../apps/web/src/lib/db/client.ts');
const {getR2Client,r2Bucket}=require('../apps/web/src/lib/r2-client.ts');
const {pdfKeyFromLocator}=require('../apps/web/src/lib/pdf-access.ts');
const {GetObjectCommand,HeadObjectCommand,GetBucketCorsCommand}=fromWeb('@aws-sdk/client-s3');
const {getSignedUrl}=fromWeb('@aws-sdk/s3-request-presigner');
const report={checkedAt:new Date().toISOString(),readOnly:true,checks:[]};
async function inspect(label,url,options={}){
  try{
    const response=await fetch(url,{...options,redirect:'manual',signal:AbortSignal.timeout(20000)});
    const result={label,status:response.status,type:response.headers.get('content-type'),cache:response.headers.get('cache-control'),allowOrigin:response.headers.get('access-control-allow-origin'),allowMethods:response.headers.get('access-control-allow-methods'),exposeHeaders:response.headers.get('access-control-expose-headers')};
    if(options.headers?.Range&&response.status===206){
      const bytes=Buffer.from(await response.arrayBuffer());
      result.pdfSignature=bytes.length===5&&bytes.toString()==='%PDF-';
    }else if(response.body)await response.body.cancel();
    report.checks.push(result);return result;
  }catch{const result={label,error:'Request failed; not verified'};report.checks.push(result);return result;}
}
(async()=>{
  const {rows}=await getDb().execute("SELECT i.pdf_url FROM issues i JOIN magazines m ON m.id=i.magazine_id WHERE m.language='english' ORDER BY i.year DESC,i.month DESC LIMIT 10");
  const Key=rows.map(row=>pdfKeyFromLocator(String(row.pdf_url))).find(Boolean);
  if(!Key)throw new Error('No supported sample');
  const client=getR2Client(),Bucket=r2Bucket();
  try{
    const cors=await client.send(new GetBucketCorsCommand({Bucket}),{abortSignal:AbortSignal.timeout(20000)});
    report.cors={readable:true,rules:cors.CORSRules};
  }catch{report.cors={readable:false,note:'CORS control-plane access not verified with this credential'};}
  const origin='https://aim-archive.vercel.app';
  const command=new GetObjectCommand({Bucket,Key,ResponseCacheControl:'private, no-store, max-age=0',ResponseContentType:'application/pdf',ResponseContentDisposition:'inline'});
  const signed=await getSignedUrl(client,command,{expiresIn:300});
  const valid=await inspect('signed GET range',signed,{headers:{Range:'bytes=0-4',Origin:origin}});
  const head=await inspect('signed HEAD',await getSignedUrl(client,new HeadObjectCommand({Bucket,Key}),{expiresIn:300}),{method:'HEAD',headers:{Origin:origin}});
  await inspect('signed GET CORS preflight',signed,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'range'}});
  const tampered=new URL(signed);tampered.searchParams.set('X-Amz-Signature','0'.repeat(64));
  const bad=await inspect('tampered signature',tampered.href,{headers:{Range:'bytes=0-4'}});
  const expired=await getSignedUrl(client,command,{expiresIn:300,signingDate:new Date(Date.now()-360000)});
  const old=await inspect('expired signature',expired,{headers:{Range:'bytes=0-4'}});
  report.corePassed=valid.status===206&&valid.pdfSignature&&/no-store/.test(valid.cache||'')&&head.status===200&&bad.status===403&&old.status===403;
  if(!report.corePassed)process.exitCode=1;
})().catch(()=>{report.error='Private delivery preflight incomplete; inspect service access privately';process.exitCode=1;}).finally(()=>{getDb().close();console.log(JSON.stringify(report,null,2));});
