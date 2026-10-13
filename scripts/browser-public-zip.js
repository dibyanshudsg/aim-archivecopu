// Uses the synthetic transport installed by browser-public-delivery.js.
async (page) => {
  await page.getByRole('button', {name:'Select all visible'}).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', {name:'Download',exact:true}).click();
  const file = await download;
  await file.saveAs('output/playwright/p2-04-download.zip');
  if(await file.failure())throw new Error('ZIP download failed');
  return {zipDownloaded:true,filename:file.suggestedFilename()};
}
