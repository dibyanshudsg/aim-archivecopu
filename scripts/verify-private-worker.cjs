// Read-only preflight: current English source metadata and five signature bytes.
const { root } = require('./register-web-typescript.cjs');
const fs = require('node:fs'), path = require('node:path');
const env = path.join(root,'apps/web/.env.local');
if(fs.existsSync(env))process.loadEnvFile(env);
const {getDb}=require('../apps/web/src/lib/db/client.ts');
const {getR2Client,r2Bucket,verifyR2Pdf}=require('../apps/web/src/lib/r2-client.ts');
const {pdfKeyFromLocator}=require('../apps/web/src/lib/pdf-access.ts');
const {fromWeb}=require('./register-web-typescript.cjs');
const {HeadObjectCommand}=fromWeb('@aws-sdk/client-s3');
(async()=>{
  const {rows}=await getDb().execute("SELECT i.pdf_url FROM issues i JOIN magazines m ON m.id=i.magazine_id WHERE m.language='english' ORDER BY i.id");
  const key=rows.map(row=>pdfKeyFromLocator(String(row.pdf_url))).find(Boolean);
  if(!key)throw new Error('No supported English source to verify');
  const head=await getR2Client().send(new HeadObjectCommand({Bucket:r2Bucket(),Key:key}),{abortSignal:AbortSignal.timeout(30_000)});
  if(!head.ContentLength || head.ContentLength>100*1024*1024)throw new Error('Invalid source size');
  await verifyR2Pdf(key,head.ContentLength);
  console.log('PASS read-only database and private R2 PDF metadata/signature access. No catalogue or object writes.');
})().catch(()=>{console.error('Private worker preflight failed. Check scoped R2 credentials, configured locator bases, database access and PDF metadata.');process.exitCode=1;}).finally(()=>getDb().close());
