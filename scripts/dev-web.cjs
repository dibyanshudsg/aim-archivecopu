// Local indexing is opt-in; production indexing is started manually on GitHub.
const { spawn } = require('node:child_process');
const { createRequire } = require('node:module');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const web = path.join(root, 'apps/web');
const fromWeb = createRequire(path.join(web, 'package.json'));
const children = new Set();
let stopping = false;
function start(args, cwd) {
  const child = spawn(process.execPath, args, {
    cwd,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  });
  children.add(child);
  child.on('exit', () => children.delete(child));
  return child;
}
function startWorker() {
  if (stopping) return;
  const worker = start([path.join(root, 'scripts/indexing-worker.cjs')], root);
  worker.on('exit', () => {
    if (!stopping) {
      console.error('Indexing worker disconnected; restarting in 30 seconds.');
      setTimeout(startWorker, 30_000);
    }
  });
}
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  setTimeout(() => process.exit(code), 1500);
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
const next = start(
  [fromWeb.resolve('next/dist/bin/next'), 'dev', '-p', '3000', ...process.argv.slice(2)],
  web,
);
next.on('exit', (code) => stop(code ?? 1));
if (process.env.INDEXING_LOCAL_WORKER === '1') startWorker();
else console.info('Indexing is manual. Use Admin > Search Indexing to open GitHub runs.');
