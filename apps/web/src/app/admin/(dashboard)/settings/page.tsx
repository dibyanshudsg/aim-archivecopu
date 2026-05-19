import { AdminSettingsClient } from './settings-client';
import { getAdminSiteSettings } from '@/lib/admin-data';

export const dynamic = 'force-dynamic';

const emptySettings = {
  feedback_form_url: '',
  feedback_form_edit_url: '',
};

export default async function AdminSettingsPage() {
  try {
    const initialSettings = await getAdminSiteSettings();
    return <AdminSettingsClient initialSettings={initialSettings} />;
  } catch (error) {
    const initialError = error instanceof Error ? error.message : 'Failed to load settings';
    return <AdminSettingsClient initialSettings={emptySettings} initialError={initialError} />;
  }
}
