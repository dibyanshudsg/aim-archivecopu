import { getAdminNavigation, listNavigationDestinations } from '@/lib/admin-data';
import { NavigationClient } from './navigation-client';

export default async function AdminNavigationPage() {
  const [navigation, destinations] = await Promise.all([
    getAdminNavigation(),
    listNavigationDestinations(),
  ]);

  return <NavigationClient initialNavigation={navigation} destinations={destinations} />;
}
