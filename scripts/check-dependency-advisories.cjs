// Registry audit: fail for any web/shared/root finding; report excluded native
// skeleton findings without treating them as accepted security exceptions.
const { spawnSync } = require('node:child_process');
const executable = process.platform === 'win32' ? 'cmd.exe' : 'pnpm';
const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'pnpm.cmd audit --json'] : ['audit', '--json'];
const result = spawnSync(executable, args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
if (result.error || ![0, 1].includes(result.status)) throw new Error('Dependency advisory service failed');
const report = JSON.parse(result.stdout);
if (!report.advisories || !report.metadata?.vulnerabilities) throw new Error('Incomplete advisory response');
let blocking = 0;
let nativeOnly = 0;
for (const advisory of Object.values(report.advisories)) {
  const paths = advisory.findings.flatMap(finding => finding.paths);
  if (paths.length && paths.every(path => path.startsWith('apps__mobile>'))) {
    nativeOnly++;
  } else {
    blocking++;
    console.error(`${advisory.severity}: ${advisory.module_name} ${advisory.github_advisory_id}`);
  }
}
console.log(JSON.stringify({ blockingAdvisories: blocking, nativeOnlyAdvisoryRecords: nativeOnly,
  note: 'Native app excluded from handover implementation; findings remain open under P6-01. No audit exceptions suppress web/shared/root findings.' }));
if (blocking) process.exitCode = 1;
