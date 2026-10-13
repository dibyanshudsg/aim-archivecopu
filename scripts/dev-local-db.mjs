#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const localDbPath = resolve(ROOT, process.env.LOCAL_TURSO_DB || '.migration/turso-local-smoke.db');

if (!existsSync(localDbPath)) {
  console.error(`Local DB not found: ${localDbPath}`);
  console.error('Restore a current database backup into an isolated local file before using dev:local-db.');
  process.exit(1);
}

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const env = {
  ...process.env,
  DATABASE_PROVIDER: 'turso',
  TURSO_DATABASE_URL: `file:${localDbPath.replace(/\\/g, '/')}`,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
};
delete env.TURSO_AUTH_TOKEN;

const child = spawn(pnpm, ['dev'], {
  cwd: resolve(ROOT, 'apps/web'),
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
