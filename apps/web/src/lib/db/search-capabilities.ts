import { getDb } from './client';
import { AsyncTtlCache } from './cache';

const capabilities = new AsyncTtlCache<boolean>(60_000, 2);
export function hasSearchIndex(name: 'issue_text_fts' | 'issue_metadata_fts') {
  return capabilities.get(name, async () => {
    const result = await getDb().execute({ sql: "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1", args: [name] });
    return result.rows.length > 0;
  });
}

export function literalFtsPhrase(query: string) { return `"${query.toLowerCase().replace(/"/g, '""')}"`; }
