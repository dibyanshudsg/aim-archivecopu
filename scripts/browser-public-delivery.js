// Run with playwright-cli run-code --filename scripts/browser-public-delivery.js.
// UI transport is intercepted with synthetic files; route authorization has separate tests.
async (page) => {
  const base = 'http://127.0.0.1:3104';
  const released = '00000000-0000-4000-8000-000000000001';
  const restricted = '00000000-0000-4000-8000-000000000002';
  let pdfRequests = 0;
  const failures = [];
  await page.unrouteAll({ behavior: 'wait' });
  page.on('pageerror', error => failures.push(error.message));
  await page.route('**/api/issues/*/cover', route => route.fulfill({path:'output/playwright/p2-04-fixtures/released.png',contentType:'image/png',headers:{'Cache-Control':'private, no-store'}}));
  await page.route('**/api/issues/*/pdf', async route => {
    pdfRequests++;
    if(pdfRequests===1)return route.fulfill({status:403,body:'Synthetic expired transfer'});
    return route.fulfill({path:'output/playwright/p2-04-fixtures/released.pdf',contentType:'application/pdf',headers:{'Cache-Control':'private, no-store','Accept-Ranges':'bytes'}});
  });
  await page.goto(base+'/read/'+released);
  await page.locator('.react-pdf__Page canvas').first().waitFor({state:'visible',timeout:30000});
  if(pdfRequests!==2)throw new Error('Expected exactly one PDF transport retry, got '+pdfRequests);
  const fileLinks=await page.locator('a[href*="/download"]').count();
  await page.screenshot({path:'output/playwright/p2-04-reader.png',fullPage:false});
  await page.evaluate(id=>{
    const key='aim-reader-state-'+id;
    const state=JSON.parse(localStorage.getItem(key)||'{}');
    localStorage.setItem(key,JSON.stringify({...state,issueId:id,page:1,scale:1.5,title:'Synthetic released',magazineName:'Synthetic Archive',coverImageUrl:'https://assets.example.test/fixtures/released.png'}));
  },released);
  await page.reload();
  await page.locator('.react-pdf__Page canvas').first().waitFor({state:'visible',timeout:30000});
  const state=await page.evaluate(id=>JSON.parse(localStorage.getItem('aim-reader-state-'+id)),released);
  if(state.page!==1 || state.scale!==1.5)throw new Error('Saved position/zoom did not survive reload');
  if(state.coverImageUrl!==`/api/issues/${released}/cover`)throw new Error('Old stored cover URL not migrated');
  await page.goto(base+'/issue/'+restricted);
  if(await page.locator('.react-pdf__Page canvas').count())throw new Error('Restricted issue rendered PDF');
  const dto=await page.evaluate(async id=>await (await fetch('/api/issues/'+id)).json(),restricted);
  if(dto.pdf_url!==null || !dto.is_embargoed)throw new Error('Restricted metadata exposed PDF access');
  await page.goto(base+'/browse');
  await page.locator('main').waitFor();
  const catalogue=await page.evaluate(async()=>await (await fetch('/api/issues?availability=all')).json());
  if(JSON.stringify(catalogue).includes('assets.example.test'))throw new Error('Public DTO contains a raw origin');
  const imageBypass=await page.request.get(base+'/_next/image?url='+encodeURIComponent('/api/issues/'+released+'/cover')+'&w=640&q=75');
  if(imageBypass.status()!==400)throw new Error('Image optimizer accepted gated cover URL');
  if(failures.length)throw new Error('Browser errors: '+failures.join('; '));
  console.log(JSON.stringify({readerRendered:true,oneTransportRetry:true,savedPageAndZoom:true,coverSnapshotMigrated:true,restrictedPdfHidden:true,rawOriginsAbsent:true,optimizerBypassDenied:true,fileLinks,pdfRequests}));
}
