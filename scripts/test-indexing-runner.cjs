const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'indexing-worker.cjs'),'utf8');
async function run(work,elapsed=0){let calls=0,closed=false,removed=false,ticks=0;
const db={execute:async()=>{removed=true;},close:()=>{closed=true;}};
const fakeProcess={argv:['node','worker','--drain'],env:{},on(){},chdir(){},exit(){throw Error('Unexpected watchdog');}};
const context={require:(name)=>name==='./register-web-typescript.cjs'?{root:'.'}:name==='node:fs'?{existsSync:()=>false}:name.endsWith('indexing-repository.ts')?{heartbeatIndexingWorker:async()=>{}}:name.endsWith('indexing-worker.ts')?{processNextIndexingJob:async()=>{calls++;return work;}}:name.endsWith('client.ts')?{getDb:()=>db}:require(name),process:fakeProcess,console:{info(){},error(){}},Date:{now:()=>ticks++===0?0:elapsed},setInterval:()=>1,clearInterval(){},setTimeout:()=>2,clearTimeout(){}};
await vm.runInNewContext(source,context);assert.ok(closed&&removed);return calls;}
(async()=>{assert.equal(await run(false),1,'Empty queue exits immediately');assert.equal(await run(true),3,'Batch never claims more than three jobs');assert.equal(await run(true,21*60_000),1,'Expired claiming window finishes current job and exits');console.log('PASS: scheduled worker exits on empty queue, caps jobs and stops claiming at deadline; heartbeat cleanup runs.');})().catch(e=>{console.error(e);process.exitCode=1;});
