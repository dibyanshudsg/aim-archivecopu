// Read-only source comparison; writes only a local ignored evidence manifest.
const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
function git(args,input){return execFileSync('git',['-c','safe.directory='+root.replace(/\\/g,'/'),...args],{cwd:root,input,encoding:'utf8',maxBuffer:32*1024*1024,stdio:['pipe','pipe','pipe']});}
function tree(ref){
  return new Map(git(['ls-tree','-rz','--full-tree',ref]).split('\0').filter(Boolean).map(row=>{
    const tab=row.indexOf('\t');const [mode,type,oid]=row.slice(0,tab).split(' ');
    if(type!=='blob')throw new Error('Unexpected non-blob source entry');
    return [row.slice(tab+1),{mode,oid}];
  }));
}
function category(file){
  if(file.startsWith('docs/')||/\.md$/i.test(file))return 'documentation-review';
  if(/^(apps|packages)\//.test(file))return 'application-and-schema';
  if(/^(scripts|ops|\.github)\//.test(file))return 'operators-tests-workflows';
  return 'root-configuration';
}
const localHead=git(['rev-parse','HEAD']).trim(),remoteHead=git(['rev-parse','origin/main']).trim();
const head=tree('HEAD'),remote=tree('origin/main');
const listed=git(['ls-files','--cached','--others','--exclude-standard','-z']).split('\0').filter(Boolean);
const indexed=new Set(git(['ls-files','--cached','-z']).split('\0').filter(Boolean));
const generatedExclusions=new Set(['apps/web/eng.traineddata','apps/web/hin.traineddata']);
const files=[...new Set([...listed,...remote.keys()])].sort();
const present=files.filter(file=>fs.existsSync(path.join(root,file))&&fs.statSync(path.join(root,file)).isFile());
// Git performs its actual clean/line-ending filters; do not mistake CRLF for a source change.
const hashes=git(['hash-object','--stdin-paths'],present.map(file=>JSON.stringify(file)).join('\n')+'\n').trim().split('\n');
if(hashes.length!==present.length)throw new Error('Hash count mismatch');
const local=new Map(present.map((file,index)=>[file,hashes[index]]));
const entries=files.map(file=>{
  const here=local.get(file),base=head.get(file)?.oid,upstream=remote.get(file)?.oid;
  let disposition;
  if(!here)disposition=upstream?'absent-locally-review-removal':'already-absent';
  else if(here===upstream)disposition='matches-github';
  else if(!upstream)disposition='local-addition';
  else if(here===base)disposition='upstream-change-not-in-workspace';
  else if(upstream===base)disposition='local-change';
  else disposition='both-differ-review';
  // A remote-tracked file can remain physically present after git rm --cached.
  // Matching bytes do not authorize restoring generated downloads to the release.
  const excludedGenerated=generatedExclusions.has(file);
  if(excludedGenerated&&indexed.has(file))throw new Error('Generated OCR file is still indexed: '+file);
  return {file,category:category(file),disposition,indexed:indexed.has(file),excludedGenerated,
    mode:remote.get(file)?.mode??head.get(file)?.mode??'100644',
    localBlob:here??null,headBlob:base??null,remoteBlob:upstream??null};
});
const counts={};for(const entry of entries)counts[entry.disposition]=(counts[entry.disposition]||0)+1;
const report={checkedAt:new Date().toISOString(),localHead,remoteHead,commits:git(['rev-list','--left-right','--count','HEAD...origin/main']).trim(),counts,entries};
const dir=path.join(root,'.codex-logs','p4-source');fs.mkdirSync(dir,{recursive:true});
const target=path.join(dir,'comparison.json');fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({localHead,remoteHead,commits:report.commits,counts,manifest:path.relative(root,target),missing:entries.filter(e=>e.disposition==='absent-locally-review-removal').map(e=>e.file),upstreamMissing:entries.filter(e=>e.disposition==='upstream-change-not-in-workspace').map(e=>e.file)},null,2));
