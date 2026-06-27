// One-off script: rewrite every issue's `title` to the canonical format
//   `{Magazine Name} — {Full Month} {Year}`
// (em dash U+2014, full month name, no abbreviations).
//
// Run from the repo root:
//   node scripts/retitle-issues.mjs

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const envPath = path.join(repoRoot, 'apps/web/.env.local');
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase env vars in apps/web/.env.local');
  process.exit(1);
}

const MONTH_NAMES = {
  1: 'January', 2: 'February', 3: 'March', 4: 'April',
  5: 'May', 6: 'June', 7: 'July', 8: 'August',
  9: 'September', 10: 'October', 11: 'November', 12: 'December',
};

// Historical migration script: resolve Supabase from the migration package, not the web app runtime.
const requireFromSupabasePackage = createRequire(path.join(repoRoot, 'packages/supabase/package.json'));
const { createClient } = requireFromSupabasePackage('@supabase/supabase-js');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const { data: issues, error } = await supabase
  .from('issues')
  .select('id, title, year, month, magazine:magazines(name)');

if (error) {
  console.error(error);
  process.exit(1);
}

let updated = 0, skipped = 0;
for (const issue of issues) {
  const monthName = MONTH_NAMES[issue.month];
  const newTitle = `${issue.magazine.name} — ${monthName} ${issue.year}`;
  if (newTitle === issue.title) {
    skipped++;
    continue;
  }
  const { error: upErr } = await supabase
    .from('issues')
    .update({ title: newTitle })
    .eq('id', issue.id);
  if (upErr) {
    console.error('FAIL', issue.id, upErr.message);
    continue;
  }
  console.log(`  ${issue.title}  →  ${newTitle}`);
  updated++;
}

console.log(`\nDone. Updated ${updated}, already-correct ${skipped}.`);
