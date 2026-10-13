// P1-05: metadata-only checks; never downloads object bodies or changes services.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { root, fromWeb } = require('./register-web-typescript.cjs');
process.loadEnvFile(path.join(root, 'apps/web/.env.local'));
const { createClient } = fromWeb('@libsql/client');
const { ListObjectsV2Command, HeadObjectCommand } = fromWeb('@aws-sdk/client-s3');
const { getR2Client, r2Bucket, storageKeyFromUrl } = require('../apps/web/src/lib/r2-client.ts');
const destination = path.resolve(process.argv[2] || '');
if (path.dirname(destination).toLowerCase() !== 'd:\\aim (project directory)' || !path.basename(destination).startsWith('P1-04_05_evidence_')) throw new Error('Expected private evidence folder');
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const r2 = getR2Client();
const Bucket = r2Bucket();
const sha = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function rows() {
  return (await db.execute('SELECT id,pdf_url,cover_image_url,file_size_bytes FROM issues ORDER BY id')).rows.map(r=>({id:r.id,pdf_url:r.pdf_url,cover_image_url:r.cover_image_url,file_size_bytes:r.file_size_bytes}));
}
async function list() {
  const result=[];
  let token;
  do {
    const page=await r2.send(new ListObjectsV2Command({Bucket,ContinuationToken:token,MaxKeys:1000}));
    for(const o of page.Contents??[]) result.push({key:o.Key,bytes:o.Size,etag:o.ETag,modified:o.LastModified?.toISOString()});
    token=page.IsTruncated?page.NextContinuationToken:undefined;
    if(page.IsTruncated&&!token)throw new Error('Incomplete listing');
  }while(token);
  return result.sort((a,b)=>a.key.localeCompare(b.key));
}
(async()=>{
  const started=new Date().toISOString();
  const before=await rows();
  const objects=await list();
  const byKey=new Map(objects.map(o=>[o.key,o]));
  const references=[];const problems=[];
  for(const issue of before) for(const field of ['pdf_url','cover_image_url']) {
    const key=issue[field]?storageKeyFromUrl(issue[field]):null;
    references.push({issue_id:issue.id,field,key});
    if(!key||!byKey.has(key))problems.push({issue_id:issue.id,field,problem:'missing or unsupported reference'});
    if(field==='pdf_url'&&key&&byKey.has(key)&&issue.file_size_bytes!=null&&Number(issue.file_size_bytes)!==byKey.get(key).bytes)problems.push({issue_id:issue.id,problem:'PDF metadata size mismatch'});
  }
  let cursor=0;
  await Promise.all(Array.from({length:6},async()=>{
    for(;;){const i=cursor++;if(i>=objects.length)return;const object=objects[i];
      const h=await r2.send(new HeadObjectCommand({Bucket,Key:object.key}));
      object.content_type=h.ContentType;object.cache_control=h.CacheControl??null;
      object.head_bytes=h.ContentLength;object.head_etag=h.ETag;
      if(h.ContentLength!==object.bytes||h.ETag!==object.etag)problems.push({key:object.key,problem:'metadata changed between list and HEAD'});
      const expected=object.key.toLowerCase().endsWith('.pdf')?'application/pdf':'image/';
      if(!h.ContentType?.startsWith(expected))problems.push({key:object.key,problem:'unexpected content type'});
    }
  }));
  const keys=new Set(references.map(r=>r.key));
  const unreferenced=objects.filter(o=>!keys.has(o.key)).map(o=>o.key);
  const after=await rows();const endList=await list();
  const startList=objects.map(({key,bytes,etag,modified})=>({key,bytes,etag,modified}));
  const stable=sha(before)===sha(after)&&sha(startList)===sha(endList);
  if(!stable)problems.push({problem:'Catalogue/object listing changed during check; repeat needed'});
  const report={started_utc:started,completed_utc:new Date().toISOString(),bucket:Bucket,
    issues:before.length,references:references.length,objects:objects.length,
    bytes:objects.reduce((n,o)=>n+o.bytes,0),stable,problems,unreferenced,
    catalogue_sha256:sha(before),reference_rows:references,object_metadata:objects,
    limits:'Metadata and reference verification only. ETags are not asserted to be content SHA-256 hashes. No object bytes backed up; no atomic cross-service snapshot.',
    verified:stable&&problems.length===0&&unreferenced.length===0};
  fs.writeFileSync(path.join(destination,'r2-reconciliation.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({issues:report.issues,references:report.references,objects:report.objects,bytes:report.bytes,stable,problems:problems.length,unreferenced:unreferenced.length,verified:report.verified,completed_utc:report.completed_utc}));
  if(!report.verified)process.exitCode=1;
})().catch(()=>{console.error('Read-only reconciliation failed; no completion declared.');process.exitCode=1;}).finally(()=>db.close());
