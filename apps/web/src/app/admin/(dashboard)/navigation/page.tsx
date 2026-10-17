import { getAdminNavigation, listNavigationDestinations } from '@/lib/admin-data';
import { NavigationClient } from './navigation-client';
import { verifyAdmin } from '@/lib/admin-auth';
import { ReadOnlyOverview } from '../read-only-overview';

export default async function AdminNavigationPage() {
  const [navigation, destinations] = await Promise.all([
    getAdminNavigation(),
    listNavigationDestinations(),
  ]);
  const admin = await verifyAdmin();
  if (admin && !admin.permissions.includes('navigation.manage')) return <ReadOnlyOverview title="Navigation" description="Review the links shown across the archive." rows={Object.values(navigation.menus).flatMap(menu => menu.items.map(item => ({ id: item.id, title: item.label, subtitle: `${menu.title} · ${item.href}`, status: item.is_published ? 'Published' : 'Hidden' })))} />;

  return <NavigationClient initialNavigation={navigation} destinations={destinations} />;
}
