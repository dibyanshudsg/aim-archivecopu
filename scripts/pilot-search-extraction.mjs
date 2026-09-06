// Local-only English prototype: no database writes. Input is the inspected PDF
// manifest. Checkpoints are evidence, not production indexing status.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const require=createRequire(new URL('../apps/web/package.json',import.meta.url));
const {createCanvas}=require('canvas');
const {createWorker}=require('tesseract.js');
const pdfjs=await import(pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href);
const dir=path.resolve('.codex-logs/indexing-pilot');
const manifest=JSON.parse(await fs.readFile(path.join(dir,'source-inspection.json'),'utf8'));
const report=[];
for(const issue of manifest.samples.filter(issue=>issue.language==='english')){
  const started=performance.now();
  const bytes=await fs.readFile(path.join(dir,issue.id+'.pdf'));
  const hash=createHash('sha256').update(bytes).digest('hex');
  const doc=await pdfjs.getDocument({data:new Uint8Array(bytes),useSystemFonts:true}).promise;
  let worker;const pages=[];let peakRss=process.memoryUsage().rss;
  const target=path.join(dir,`${issue.id}-extraction.json`);
  let previous;
  try{previous=JSON.parse(await fs.readFile(target,'utf8'));}catch{}
  const save=async(complete)=>fs.writeFile(target,JSON.stringify({version:1,id:issue.id,title:issue.title,language:issue.language,sourceSha256:hash,physicalPages:doc.numPages,complete,wallSeconds:+((performance.now()-started)/1000).toFixed(2),peakRssMiB:Math.round(peakRss/1048576),pages},null,2));
  try{
    for(let n=1;n<=doc.numPages;n++){
      const cached=previous?.version===1&&previous.sourceSha256===hash?previous.pages.find(p=>p.pageNumber===n):null;
      if(cached){pages.push(cached);continue;}
      const pageStarted=performance.now();const page=await doc.getPage(n);
      const items=(await page.getTextContent()).items.filter(i=>'str'in i);
      const native=items.map(i=>i.str+(i.hasEOL?'\n':' ')).join('').normalize('NFC').trim();
      const letters=(native.match(/\p{L}/gu)||[]).length;
      const useful=letters>=80&&letters/Math.max(native.length,1)>0.45&&!native.includes('\ufffd');
      let content=native,method='native',confidence=null;
      if(!useful){
        worker??=await createWorker('eng',1,{cachePath:dir});
        const viewport=page.getViewport({scale:2.5});const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
        await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
        const result=await worker.recognize(canvas.toBuffer('image/png'));
        content=result.data.text.normalize('NFC').trim();confidence=result.data.confidence;method='ocr';
        canvas.width=0;canvas.height=0;
      }
      // Retain all physical pages, including blank/low-confidence pages, for QA.
      pages.push({pageNumber:n,method,confidence,seconds:+((performance.now()-pageStarted)/1000).toFixed(3),content});
      peakRss=Math.max(peakRss,process.memoryUsage().rss);page.cleanup();await save(false);
      console.log(`${issue.language} ${issue.id} page ${n}/${doc.numPages}: ${method}, ${content.length} chars${confidence===null?'':', confidence '+confidence}`);
    }
    await save(true);
    report.push({id:issue.id,title:issue.title,physicalPages:doc.numPages,nativePages:pages.filter(p=>p.method==='native').length,ocrPages:pages.filter(p=>p.method==='ocr').length,emptyPages:pages.filter(p=>!p.content).length,lowConfidencePages:pages.filter(p=>p.confidence!==null&&p.confidence<70).map(p=>p.pageNumber),processingSeconds:+pages.reduce((s,p)=>s+p.seconds,0).toFixed(2),peakRssMiB:Math.round(peakRss/1048576)});
  }finally{if(worker)await worker.terminate();await doc.destroy();}
}
await fs.writeFile(path.join(dir,'pilot-summary.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
