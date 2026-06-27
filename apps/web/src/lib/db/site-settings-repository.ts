import { getDb, nowIso } from './client';
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from '@/lib/site-settings';

const SETTING_KEYS = ['feedback_form_url', 'feedback_form_edit_url'] as const;

export async function readSiteSettingsFromDb(): Promise<SiteSettings> {
  const result = await getDb().execute({
    sql: `SELECT key, value FROM site_settings WHERE key IN (${SETTING_KEYS.map(() => '?').join(', ')})`,
    args: [...SETTING_KEYS],
  });

  return result.rows.reduce<SiteSettings>((acc, row) => {
    const key = String(row.key) as keyof SiteSettings;
    if (key === 'feedback_form_url' || key === 'feedback_form_edit_url') {
      acc[key] = typeof row.value === 'string' && row.value.trim() ? row.value : acc[key];
    }
    return acc;
  }, { ...DEFAULT_SITE_SETTINGS });
}

export async function upsertSiteSettingsInDb(settings: SiteSettings, adminId: string): Promise<void> {
  const now = nowIso();
  await getDb().batch(
    SETTING_KEYS.map((key) => ({
      sql: `
        INSERT INTO site_settings (key, value, updated_by, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_by = excluded.updated_by,
          updated_at = excluded.updated_at
      `,
      args: [key, settings[key], adminId, now],
    })),
    'write',
  );
}
