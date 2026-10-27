import { AdminSettingsClient } from './settings-client';
import { getAdminSiteSettings } from '@/lib/admin-data';
import { verifyAdmin } from '@/lib/admin-auth';
import { ReadOnlyOverview } from '../read-only-overview';
import { readBrandAssets } from '@/lib/brand-assets';

export const dynamic = 'force-dynamic';

const emptySettings = {
  feedback_form_url: '',
  feedback_form_edit_url: '',
};

export default async function AdminSettingsPage() {
  try {
    const [initialSettings, initialBrand] = await Promise.all([getAdminSiteSettings(), readBrandAssets()]);
    const admin = await verifyAdmin();
    if (admin && !admin.permissions.includes('settings.manage')) return <ReadOnlyOverview title="Settings" description="Review the current archive settings." rows={[{ id: 'brand', title: 'Brand images', subtitle: Object.entries(initialBrand).filter(([, active]) => active).map(([slot]) => slot).join(', ') || 'Default images' }, { id: 'feedback', title: 'Feedback form', subtitle: initialSettings.feedback_form_url || 'Not configured' }, { id: 'feedback-edit', title: 'Feedback edit link', subtitle: initialSettings.feedback_form_edit_url ? 'Configured' : 'Not configured' }]} />;
    return <AdminSettingsClient initialSettings={initialSettings} initialBrand={initialBrand} />;
  } catch (error) {
    const initialError = error instanceof Error ? error.message : 'Failed to load settings';
    const admin = await verifyAdmin();
    if (admin && !admin.permissions.includes('settings.manage')) return <ReadOnlyOverview title="Settings" description="Settings are temporarily unavailable. Refresh to try again." rows={[]} />;
    return <AdminSettingsClient initialSettings={emptySettings} initialBrand={{ logo: false, favicon: false, social: false }} initialError={initialError} />;
  }
}
