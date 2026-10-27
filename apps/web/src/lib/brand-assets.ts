import { getDb, nowIso } from './db/client';

export const BRAND_SLOTS = ['logo', 'favicon', 'social'] as const;
export type BrandSlot = (typeof BRAND_SLOTS)[number];
export type BrandAssets = Record<BrandSlot, boolean>;

const keyFor = (slot: BrandSlot) => `brand_${slot}_key`;

export async function readBrandAssetKeys(): Promise<Record<BrandSlot, string | null>> {
  const result = await getDb().execute({
    sql: 'SELECT key,value FROM site_settings WHERE key IN (?,?,?)',
    args: BRAND_SLOTS.map(keyFor),
  });
  const assets: Record<BrandSlot, string | null> = { logo: null, favicon: null, social: null };
  for (const row of result.rows) {
    const slot = BRAND_SLOTS.find((item) => keyFor(item) === row.key);
    if (slot && typeof row.value === 'string' && /^brand\/(logo|favicon|social)\/[a-f0-9-]+\.png$/.test(row.value)) assets[slot] = row.value;
  }
  return assets;
}

export async function readBrandAssets(): Promise<BrandAssets> {
  const keys = await readBrandAssetKeys();
  return { logo: Boolean(keys.logo), favicon: Boolean(keys.favicon), social: Boolean(keys.social) };
}

export async function saveBrandAssetKeys(keys: Partial<Record<BrandSlot, string | null>>, adminId: string): Promise<void> {
  const entries = Object.entries(keys) as [BrandSlot, string | null][];
  await getDb().batch(entries.map(([slot, value]) => value === null
    ? { sql: 'DELETE FROM site_settings WHERE key=?', args: [keyFor(slot)] }
    : { sql: `INSERT INTO site_settings(key,value,updated_by,updated_at) VALUES(?,?,?,?)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
      args: [keyFor(slot), value, adminId, nowIso()] }), 'write');
}
