import { createAdminClient, createPublicClient } from '@/lib/supabase-server';

export interface SiteSettings {
  feedback_form_url: string;
  feedback_form_edit_url: string;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  feedback_form_url: 'https://docs.google.com/forms/d/1VgXbG81Gxloes4cTGcfwzqlfiHxwmToqe_obSj_Mv9w/viewform',
  feedback_form_edit_url: 'https://docs.google.com/forms/d/1VgXbG81Gxloes4cTGcfwzqlfiHxwmToqe_obSj_Mv9w/edit',
};

const SETTING_KEYS = ['feedback_form_url', 'feedback_form_edit_url'] as const;

type SettingsClient = ReturnType<typeof createPublicClient> | ReturnType<typeof createAdminClient>;

export async function readSiteSettings(client: SettingsClient): Promise<SiteSettings> {
  const { data, error } = await client
    .from('site_settings')
    .select('key, value')
    .in('key', SETTING_KEYS);

  if (error) throw error;

  return (data ?? []).reduce<SiteSettings>(
    (acc, row) => {
      const key = row.key as keyof SiteSettings;
      if (key === 'feedback_form_url' || key === 'feedback_form_edit_url') {
        acc[key] = row.value?.trim() || acc[key];
      }
      return acc;
    },
    { ...DEFAULT_SITE_SETTINGS },
  );
}

export async function upsertSiteSettings(
  client: ReturnType<typeof createAdminClient>,
  settings: SiteSettings,
  adminId: string,
) {
  const rows = SETTING_KEYS.map((key) => ({
    key,
    value: settings[key],
    updated_by: adminId,
  }));

  const { error } = await client.from('site_settings').upsert(rows, { onConflict: 'key' });
  if (error) throw error;
}
