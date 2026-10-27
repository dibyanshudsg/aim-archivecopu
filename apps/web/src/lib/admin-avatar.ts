import { getDb, nowIso } from './db/client';

const settingKey = (adminId: string) => `admin_avatar_${adminId}`;

export async function readAdminAvatarKey(adminId: string): Promise<string | null> {
  const result = await getDb().execute({ sql: 'SELECT value FROM site_settings WHERE key=? LIMIT 1', args: [settingKey(adminId)] });
  const value = result.rows[0]?.value;
  return typeof value === 'string' && /^admin-avatars\/[a-f0-9-]+\/[a-f0-9-]+\.png$/.test(value) ? value : null;
}

export async function saveAdminAvatarKey(adminId: string, key: string | null): Promise<void> {
  if (key === null) {
    await getDb().execute({ sql: 'DELETE FROM site_settings WHERE key=?', args: [settingKey(adminId)] });
    return;
  }
  await getDb().execute({
    sql: `INSERT INTO site_settings(key,value,updated_by,updated_at) VALUES(?,?,?,?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
    args: [settingKey(adminId), key, adminId, nowIso()],
  });
}
