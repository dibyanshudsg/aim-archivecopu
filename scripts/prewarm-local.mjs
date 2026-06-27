#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

const ROOT = resolve(import.meta.dirname, '..');
const BASE_URL = (process.env.PREWARM_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

loadEnvFile(resolve(ROOT, 'apps/web/.env.local'));
loadEnvFile(resolve(ROOT, '.env.local'));

const publicRoutes = [
  '/',
  '/browse',
  '/search',
  '/bookmarks',
  '/api/magazines',
  '/api/issues',
  '/api/site-settings',
];

const adminRoutes = [
  '/admin',
  '/admin/issues',
  '/admin/issues/new',
  '/admin/magazines',
  '/admin/storage',
  '/admin/settings',
  '/api/admin/auth/check',
  '/api/admin/issues?page=1&pageSize=25',
  '/api/admin/magazines',
  '/api/admin/topics',
];

const issueRoutes = await discoverIssueRoutes();
const cookie = await loginCookie();

console.log(`Prewarming ${BASE_URL}`);
for (const route of [...publicRoutes, ...issueRoutes]) {
  await warm(route);
}

if (cookie) {
  for (const route of adminRoutes) {
    await warm(route, cookie);
  }
} else {
  console.log('skip admin routes: ADMIN_PASSWORD is not configured');
}

async function discoverIssueRoutes() {
  try {
    const response = await fetch(`${BASE_URL}/api/issues?page_size=1`);
    if (!response.ok) return [];
    const payload = await response.json();
    const issue = Array.isArray(payload?.data) ? payload.data[0] : null;
    if (!issue?.id) return [];
    return [`/issue/${issue.id}`, `/read/${issue.id}`];
  } catch {
    return [];
  }
}

async function loginCookie() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;

  const email = process.env.ADMIN_EMAIL || 'admin@aurosociety.org';
  const response = await fetch(`${BASE_URL}/api/admin/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) return null;

  const setCookie = response.headers.get('set-cookie');
  return setCookie ? setCookie.split(';')[0] : null;
}

async function warm(route, cookie) {
  const started = performance.now();
  try {
    const response = await fetch(`${BASE_URL}${route}`, {
      headers: cookie ? { cookie } : undefined,
      redirect: 'manual',
    });
    const elapsed = Math.round(performance.now() - started);
    console.log(`${response.status.toString().padStart(3)} ${elapsed.toString().padStart(5)}ms ${route}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'request failed';
    console.log(`ERR       ${route} - ${message}`);
  }
}

function loadEnvFile(path) {
  try {
    const content = readFileSync(path, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const index = line.indexOf('=');
      if (index < 0) continue;
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // Optional convenience only.
  }
}
