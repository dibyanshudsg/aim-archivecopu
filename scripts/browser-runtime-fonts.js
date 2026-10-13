// Pass to playwright-cli run-code --filename on an isolated local production build.
async (page) => {
  if (!['localhost', '127.0.0.1'].includes(new URL(page.url()).hostname)) throw new Error('Local fixture only');
  const result = await page.evaluate(async () => {
    const samples = [
      ['--font-inter', '400', 'AIM Archive: Reading and searching'],
      ['--font-inter', '700', 'AIM Archive bold'],
      ['--font-aboreto', '400', 'All India Magazine'],
      ['--font-tiro-deva', '400', 'श्री अरविन्द — अग्निशिखा'],
      ['--font-tangerine', '400', 'A life of aspiration'],
      ['--font-tangerine', '700', 'A life of aspiration'],
    ];
    const results = [];
    const sample = document.createElement('section');
    sample.style.cssText = 'background:white;color:black;padding:24px;position:fixed;inset:20px;z-index:9999;overflow:auto';
    for (const [variable, weight, text] of samples) {
      const family = getComputedStyle(document.documentElement).getPropertyValue(variable).split(',')[0].trim();
      const faces = await document.fonts.load(weight + ' 32px ' + family, text);
      if (!faces.length || faces.some(face => face.status !== 'loaded')) throw new Error('Font failed: ' + variable);
      const p = document.createElement('p');
      p.style.font = weight + ' 32px ' + family;
      p.textContent = text;
      sample.appendChild(p);
      results.push({ variable, weight, loaded: faces.length });
    }
    document.body.appendChild(sample);
    await document.fonts.ready;
    const requests = performance.getEntriesByType('resource').filter(r => r.name.includes('.woff'))
      .map(r => ({ local: new URL(r.name).origin === location.origin, bytes: r.transferSize }));
    if (requests.some(r => !r.local)) throw new Error('External font request');
    return { results, requests };
  });
  return result;
}
