// Synthetic seeded admin, mocked asset transport; actual authorization tested separately.
async (page) => {
  const base='http://127.0.0.1:3105', draft='00000000-0000-4000-8000-000000000003';
  const errors=[],assetRequests=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(request.url().includes('assets.example.test'))assetRequests.push(request.url());});
  await page.goto(base+'/admin/login');
  const login=await page.request.post(base+'/api/admin/auth',{data:{email:'admin@example.test',password:'synthetic-browser-password'}});
  if(!login.ok())throw new Error('Synthetic admin login failed: '+login.status());
  let pdfRequests=0;
  await page.route('**/api/admin/issues/*/pdf',route=>{
    pdfRequests++;
    return route.fulfill({path:'output/playwright/p2-04-fixtures/released.pdf',contentType:'application/pdf',headers:{'Cache-Control':'private, no-store'}});
  });
  await page.route('**/api/admin/issues/*/cover',route=>route.fulfill({path:'output/playwright/p2-04-fixtures/released.png',contentType:'image/png',headers:{'Cache-Control':'private, no-store'}}));
  await page.goto(base+'/admin/indexing/'+draft+'/preview');
  await page.locator('.react-pdf__Page canvas').first().waitFor({state:'visible',timeout:30000});
  if(pdfRequests<1)throw new Error('Preview did not use authenticated PDF route');
  await page.screenshot({path:'output/playwright/p2-05-admin-preview.png',fullPage:false});
  await page.goto(base+'/admin/issues');
  await page.locator('img[src*="/api/admin/issues/"]').first().waitFor({state:'visible',timeout:30000});
  const images=await page.locator('img[src*="/api/admin/issues/"]').count();
  if(assetRequests.length)throw new Error('Admin requested raw asset origin');
  if(errors.length)throw new Error(errors.join('; '));
  return {draftPreviewRendered:true,authenticatedPdfRequests:pdfRequests,authenticatedCoverImages:images,rawOriginRequests:assetRequests.length,browserErrors:errors.length};
}
