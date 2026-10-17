#!/usr/bin/env node
// Read-only predeploy gate; reports names and policy errors, never secret values.
const errors = [];
if (!process.env.TURSO_DATABASE_URL) errors.push('TURSO_DATABASE_URL is missing.');
if (!process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET.length < 32)
  errors.push('ADMIN_SESSION_SECRET must be an independent secret of at least 32 characters.');
if (process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET === process.env.ADMIN_PASSWORD)
  errors.push('ADMIN_SESSION_SECRET must differ from ADMIN_PASSWORD.');
if (process.env.ADMIN_LEGACY_ENROLLMENT === '1' && !process.argv.includes('--allow-enrollment'))
  errors.push('ADMIN_LEGACY_ENROLLMENT is active; use an explicit enrollment release procedure.');
if (process.env.VERCEL !== '1' && process.env.TRUST_PROXY_IP_HEADERS !== '1')
  errors.push('Non-Vercel hosting requires a trusted proxy that overwrites forwarding headers.');
const scale = Number(process.env.RATE_LIMIT_SCALE || '1');
if (!Number.isFinite(scale) || scale < 0.5 || scale > 5)
  errors.push('RATE_LIMIT_SCALE must be between 0.5 and 5.');
if (errors.length) { for (const error of errors) console.error(error); process.exitCode = 1; }
else console.log('PASS admin release environment policy. Verify database migrations, WAF rules and hosted role flows separately.');
