// Read-only database/source inspection. Downloads two readable English PDFs locally;
// writes evidence only under ignored .codex-logs/indexing-pilot.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
process.loadEnvFile(fileURLToPath(new URL('../apps/web/.env.local', import.meta.url)));
const fromRoot = createRequire(import.meta.url);
fromRoot('./register-web-typescript.cjs');
const { supportedAssetSql } = fromRoot('../apps/web/src/lib/asset-url.ts');
const { readPrivatePdf } = fromRoot('../apps/web/src/lib/private-pdf.ts');
const { createClient } = require('@libsql/client');
const { createCanvas } = require('canvas');
const pdfjs = await import(pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href);
const db = createClient({url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN});
const dir = path.resolve('.codex-logs/indexing-pilot');
await fs.mkdir(dir,{recursive:true});
const india = new Date(Date.now()+330*60000);
const year=india.getUTCFullYear()-5, month=india.getUTCMonth()+1;
try {
  const {rows} = await db.execute({sql:`SELECT i.id,i.title,i.pdf_url,i.page_count,m.language
    FROM issues i JOIN magazines m ON m.id=i.magazine_id
    WHERE i.is_published=1 AND trim(i.pdf_url)<>'' AND ${supportedAssetSql('i.pdf_url')}
    AND (i.year<? OR (i.year=? AND i.month<=?)) ORDER BY i.year DESC,i.month DESC,i.id`,args:[year,year,month]});
  const english=rows.filter(r=>r.language==='english');
  const samples=[english[0],english.at(-1)].filter((issue,index,all)=>issue && all.findIndex(other=>other?.id===issue.id)===index);
  const report=[];
  for(const issue of samples){
    const start=performance.now();
    const filename=path.join(dir,issue.id+'.pdf');
    const buffer=await readPrivatePdf(issue.pdf_url);await fs.writeFile(filename,buffer);
    const doc=await pdfjs.getDocument({data:new Uint8Array(buffer),useSystemFonts:true}).promise;
    const pages=[];
    try{
      for(let n=1;n<=doc.numPages;n++){
        const page=await doc.getPage(n);const content=await page.getTextContent();
        const text=content.items.filter(i=>'str' in i).map(i=>i.str+(i.hasEOL?'\n':' ')).join('').trim();
        pages.push({page:n,characters:text.length,letters:(text.match(/\p{L}/gu)||[]).length,devanagari:(text.match(/[\u0900-\u097f]/g)||[]).length,replacementCharacters:(text.match(/\ufffd/g)||[]).length});
        await fs.writeFile(path.join(dir,`${issue.id}-page-${n}.txt`),text);
        if([1,3,5,Math.ceil(doc.numPages/2)].includes(n)){
          const viewport=page.getViewport({scale:1.25});const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
          await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
          await fs.writeFile(path.join(dir,`${issue.id}-page-${n}.png`),canvas.toBuffer('image/png'));
        }
        page.cleanup();
      }
      const item={id:issue.id,title:issue.title,language:issue.language,storedPageCount:issue.page_count,physicalPages:doc.numPages,bytes:buffer.length,seconds:+((performance.now()-start)/1000).toFixed(2),pages};
      report.push(item);console.log(JSON.stringify(item));
    }finally{await doc.destroy();}
  }
  await fs.writeFile(path.join(dir,'source-inspection.json'),JSON.stringify({date:new Date().toISOString(),samples:report},null,2));
}finally{db.close();}
