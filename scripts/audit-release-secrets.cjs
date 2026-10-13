// Offline source/history audit. Outputs locations/types only; no matches or secret values.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const scanner=process.argv[2];if(!scanner)throw new Error('Pass the path to a verified Gitleaks executable');
const env={...process.env,GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'safe.directory',GIT_CONFIG_VALUE_0:root.replace(/\\/g,'/')};
delete env.GITLEAKS_CONFIG;delete env.GITLEAKS_CONFIG_TOML;
function run(command,args,input){const result=spawnSync(command,args,{cwd:root,env,input,maxBuffer:150*1024*1024,timeout:240000});if(result.error||![0,1].includes(result.status))throw new Error(`Audit subprocess failed (${result.error?.code||result.status}); no raw output disclosed`);return result;}
function git(args,input){const result=run('git',args,input);if(result.status!==0)throw new Error('Read-only Git operation failed');return result.stdout;}
const common=['--no-banner','--no-color','--redact=100','--ignore-gitleaks-allow','--log-level=error','--report-format=json','--report-path=-'];
const mapFinding=f=>({rule:f.RuleID,file:f.File,line:f.StartLine,commit:f.Commit||null});
const historyRun=run(scanner,['git','--log-opts=--all',...common,root]);
const history=JSON.parse(historyRun.stdout.toString()||'[]').map(mapFinding);
const files=[...new Set(git(['ls-files','--cached','--others','--exclude-standard','-z']).toString().split('\0').filter(Boolean))].sort();
let aggregate='',line=1;const segments=[],skipped=[];
const known=[];
for(const file of ['apps/web/.env.local','.env.r2.local']){
  if(!fs.existsSync(path.join(root,file)))continue;
  for(const row of fs.readFileSync(path.join(root,file),'utf8').split(/\r?\n/)){
    const match=/^([A-Z][A-Z0-9_]*)=(.*)$/.exec(row);
    if(!match||!/(PASSWORD|SECRET|TOKEN|ACCESS_KEY_ID)/.test(match[1]))continue;
    const value=match[2].trim().replace(/^(['"])(.*)\1$/,'$2');
    if(value.length>=8)known.push({name:match[1],value});
  }
}
const exact=[],credentialMentions=[];
function inspect(text,file,blob=null){
  for(const secret of known){let offset=text.indexOf(secret.value);while(offset>=0){exact.push({file,blob,line:text.slice(0,offset).split('\n').length,variable:secret.name});offset=text.indexOf(secret.value,offset+secret.value.length);}}
  if(/\.md$/i.test(file))text.split('\n').forEach((row,index)=>{
    if(/(?:password|credential|login details|service.role|api.?key)\s*[:=]/i.test(row.replace(/[*`]/g,'')))credentialMentions.push({file,blob,line:index+1});
  });
}
for(const file of files){
  const full=path.join(root,file);if(!fs.existsSync(full)||!fs.statSync(full).isFile())continue;
  const bytes=fs.readFileSync(full);
  if(bytes.includes(0)||/\.(png|jpe?g|ico|woff2?|pdf|traineddata)$/i.test(file)){skipped.push(file);continue;}
  const text=bytes.toString('utf8');inspect(text,file);
  const body=text+'\n';segments.push({file,start:line,end:line+body.split('\n').length-2});aggregate+=body;line+=body.split('\n').length-1;
}
const currentRun=run(scanner,['stdin',...common],aggregate);
const current=JSON.parse(currentRun.stdout.toString()||'[]').map(f=>{
  const segment=segments.find(s=>f.StartLine>=s.start&&f.StartLine<=s.end);
  return {rule:f.RuleID,file:segment?.file??'UNMAPPED',line:segment?f.StartLine-segment.start+1:f.StartLine};
});
// Exact current-secret matches also cover unchanged historical blobs, independently of diff scanning.
const objects=git(['rev-list','--objects','--all']).toString().trim().split('\n').map(row=>{const at=row.indexOf(' ');return {oid:at<0?row:row.slice(0,at),file:at<0?'':row.slice(at+1)};});
const metadata=git(['cat-file','--batch-check=%(objectname) %(objecttype) %(objectsize)'],objects.map(o=>o.oid).join('\n')+'\n').toString().trim().split('\n');
const blobs=[];let skippedHistory=0;
metadata.forEach((row,index)=>{const [oid,type,size]=row.split(' ');if(type==='blob'){if(Number(size)>10*1024*1024||/\.(png|jpe?g|ico|woff2?|pdf|traineddata)$/i.test(objects[index].file))skippedHistory++;else blobs.push({...objects[index],oid});}});
let scannedBlobs=0;
for(let offset=0;offset<blobs.length;offset+=10){
  const group=blobs.slice(offset,offset+10),batch=git(['cat-file','--batch'],group.map(o=>o.oid).join('\n')+'\n');let cursor=0;
  for(const blob of group){const end=batch.indexOf(10,cursor);const size=Number(batch.subarray(cursor,end).toString().split(' ')[2]);const content=batch.subarray(end+1,end+1+size);cursor=end+1+size+1;if(content.includes(0)){skippedHistory++;continue;}scannedBlobs++;inspect(content.toString('utf8'),blob.file,blob.oid);}
}
const report={checkedAt:new Date().toISOString(),commits:Number(git(['rev-list','--all','--count']).toString()),sourceTextFiles:segments.length,skippedCurrentBinary:skipped,scannedHistoricalTextBlobs:scannedBlobs,skippedHistoricalBlobs:skippedHistory,knownSecretNames:[...new Set(known.map(s=>s.name))],gitleaks:{history,current},exactCurrentSecretMatches:exact,documentationCredentialMentions:credentialMentions};
const dir=path.join(root,'.codex-logs','p4-secrets');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'audit-redacted.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({commits:report.commits,sourceTextFiles:report.sourceTextFiles,scannedHistoricalTextBlobs:scannedBlobs,skippedHistoricalBlobs:skippedHistory,gitleaks:report.gitleaks,exactCurrentSecretMatches:exact,documentationCredentialMentions:credentialMentions},null,2));
if(history.length||current.length||exact.length||credentialMentions.length)process.exitCode=1;
