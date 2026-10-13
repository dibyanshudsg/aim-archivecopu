// Local, isolated regression gate. Live origin checks require a separate reviewed manifest.
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const tests=[
  'test-pdf-access-fixtures.cjs','test-pdf-delivery.cjs','test-public-delivery.cjs',
  'test-private-maintenance.cjs','test-local-pdf-denial.cjs','test-pdf-origins.cjs',
  'test-indexing-jobs.cjs','test-indexing-controls.cjs','test-indexing.cjs',
];
for(const test of tests){
  console.log(`\nRunning ${test}`);
  const result=spawnSync(process.execPath,[path.join(__dirname,test)],{stdio:'inherit',timeout:120000,cwd:path.resolve(__dirname,'..')});
  if(result.error||result.status!==0){console.error(`FAIL ${test}`);process.exit(1);}
}
console.log(`\nPASS ${tests.length} local PDF security suites. Hosted R2 enforcement/CORS and deployed old-origin denial remain unverified.`);
