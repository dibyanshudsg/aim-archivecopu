// Hash a reviewed runtime-source scope without copying secrets or archive assets.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const git=(...args)=>execFileSync('git',['-c','safe.directory='+root.replace(/\\/g,'/'),...args],{cwd:root,encoding:'utf8'}).trim();
const candidates=git('ls-files','--cached','--others','--exclude-standard','-z').split('\0').filter(Boolean);
const roots=['apps/web/','apps/mobile/','packages/shared/','packages/turso/','scripts/','.github/workflows/','ops/'];
const exact=['package.json','pnpm-lock.yaml','pnpm-workspace.yaml','turbo.json','.node-version','.gitignore','.vercelignore'];
const entries=[...new Set(candidates)].filter(file=>(roots.some(prefix=>file.startsWith(prefix))||exact.includes(file))
  && !file.split('/').some(part=>part.startsWith('.env')||['node_modules','.next','__pycache__'].includes(part))
  && !/\.(pdf|db|sqlite|pyc|tsbuildinfo)$/i.test(file) && fs.existsSync(path.join(root,file))).sort().map(file=>{
    const content=fs.readFileSync(path.join(root,file));return {file,bytes:content.length,sha256:crypto.createHash('sha256').update(content).digest('hex')};
  });
const digest=crypto.createHash('sha256').update(JSON.stringify(entries)).digest('hex');
const report={createdAt:new Date().toISOString(),localHead:git('rev-parse','HEAD'),scope:'Runtime source and operator/test scripts; excludes environment files, archive assets, generated builds and docs. Not a Git commit or deployment package.',files:entries.length,sha256:digest,entries};
const dir=path.join(root,'.codex-logs','p2-08');fs.mkdirSync(dir,{recursive:true});
const target=path.join(dir,'candidate-'+digest.slice(0,12)+'.json');fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({manifest:path.relative(root,target),files:entries.length,sha256:digest,localHead:report.localHead}));
