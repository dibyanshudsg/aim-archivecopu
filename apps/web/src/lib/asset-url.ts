/** Only configured current/former R2 bases are eligible catalogue assets. */
export function supportedAssetBases(): string[] {
  const current = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/+$/, '');
  if (!current) return [];
  return [...new Set([current, ...(process.env.R2_LEGACY_PUBLIC_BASE_URLS ?? '').split(',')]
    .map(value => value.trim().replace(/\/+$/, ''))
    .filter(value => {
      try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash;
      } catch { return false; }
    }))];
}

export function isSupportedAssetUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return supportedAssetBases().some(base => value.startsWith(base + '/') && value.length > base.length + 1);
}

/** Column names are restricted; trusted configuration literals are SQL-escaped.
 * Exact prefix comparisons avoid SQL LIKE wildcard interpretation in asset bases.
 */
export function supportedAssetSql(column: 'pdf_url' | 'i.pdf_url'): string {
  if (column !== 'pdf_url' && column !== 'i.pdf_url') throw new Error('Invalid asset column');
  const bases = supportedAssetBases();
  if (!bases.length) return '(0 = 1)';
  return '(' + bases.map(base => {
    const prefix = base + '/';
    const literal = "'" + prefix.replaceAll("'", "''") + "'";
    return `(substr(coalesce(${column}, ''), 1, ${prefix.length}) = ${literal} AND length(coalesce(${column}, '')) > ${prefix.length})`;
  }).join(' OR ') + ')';
}

/** Rewrite only explicitly configured former asset origins during a domain move. */
export function normalizePublicAssetUrl(url: string): string {
  const target = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, '');
  if (!target) return url;
  for (const raw of (process.env.R2_LEGACY_PUBLIC_BASE_URLS ?? '').split(',')) {
    const base = raw.trim().replace(/\/+$/, '');
    if (base && url.startsWith(base + '/')) return target + url.slice(base.length);
  }
  return url;
}
