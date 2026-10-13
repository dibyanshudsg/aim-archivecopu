#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createClient, readMigrations, migrationState, applyMigrations, verifyMigrationSchema } from './lib/turso-migrations.mjs';

const root = path.resolve(import.meta.dirname, '..');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([^#][^=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function main() {
  const options = {};
  const values = new Set(['--local', '--url-env', '--token-env', '--env-file', '--through', '--confirm-target', '--backup-ref']);
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (Object.hasOwn(options, arg)) throw new Error('Duplicate option.');
    if (values.has(arg)) {
      const value = process.argv[++i];
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value.`);
      options[arg] = value;
    } else if (['--apply', '--baseline', '--status', '--help'].includes(arg)) options[arg] = true;
    else throw new Error('Unknown option; use --help. Legacy --only/--skip-fts are deliberately unsupported.');
  }
  if (options['--help']) {
    console.log('Usage: node scripts/apply-turso-migrations.mjs (--local PATH | --url-env NAME) [--token-env NAME] [--env-file PATH] [--status | --apply | --baseline] [--through FILENAME] [--backup-ref ID] [--confirm-target ID]\nDefault: read-only status. Remote writes require the target ID from status and a backup reference. Baseline requires an exact schema match and --through. No environment file loads implicitly.');
    return;
  }
  if (['--apply', '--baseline', '--status'].filter(key => options[key]).length > 1) throw new Error('Choose one operation.');
  if (!!options['--local'] === !!options['--url-env']) throw new Error('Select exactly one explicit --local PATH or --url-env NAME target.');
  if (options['--env-file']) loadEnv(path.resolve(root, options['--env-file']));
  const local = options['--local'] && path.resolve(root, options['--local']);
  const url = local ? `file:${local.replace(/\\/g, '/')}` : process.env[options['--url-env']];
  if (!url || (!local && !/^libsql:\/\//.test(url))) throw new Error('Use --local for files or an explicit environment variable containing a libsql:// target.');
  const authToken = local ? undefined : process.env[options['--token-env'] || 'TURSO_AUTH_TOKEN'];
  if (!local && !authToken) throw new Error('Missing selected database token.');
  const targetId = createHash('sha256').update(url).digest('hex').slice(0, 16);
  const write = options['--apply'] || options['--baseline'];
  if (!local && write && (options['--confirm-target'] !== targetId || !options['--backup-ref']?.trim())) throw new Error('Remote writes require the status target ID and --backup-ref.');
  const migrations = readMigrations();
  const throughCount = options['--through'] ? migrations.findIndex(m => m.file === options['--through']) + 1 : 0;
  if (options['--through'] && !throughCount) throw new Error('Unknown --through migration filename.');
  if (local && !fs.existsSync(local) && !write) {
    console.log(JSON.stringify({ targetId, target: 'local', exists: false, pending: migrations.map(m => m.file) }, null, 2));
    return;
  }
  if (local && write) fs.mkdirSync(path.dirname(local), { recursive: true });
  const db = createClient({ url, authToken });
  try {
    const result = write ? await applyMigrations(db, migrations, {
      through: options['--through'], baseline: !!options['--baseline'], evidence: options['--backup-ref'] || '',
    }) : await migrationState(db, migrations);
    if (!write && throughCount) {
      await verifyMigrationSchema(db, migrations.slice(0, throughCount));
      result.schemaVerifiedThrough = options['--through'];
    }
    console.log(JSON.stringify({ targetId, target: local ? 'local' : 'remote', ...result }, null, 2));
  } finally { db.close(); }
}

main().catch((error) => {
  // Never forward provider errors that can contain a URL, token or SQL data.
  console.error(error?.code ? `Migration failed (${error.code}); inspect the selected target privately.` : error instanceof Error ? error.message : 'Migration failed.');
  process.exit(1);
});
