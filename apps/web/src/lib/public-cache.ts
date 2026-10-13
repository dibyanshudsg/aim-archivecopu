import { revalidatePath, revalidateTag } from 'next/cache';
import { clearPublicRepositoryCaches, clearAdminDiscoveryCaches } from '@/lib/db';

export function refreshPublicArchiveCaches(issueId?: string): void {
  clearPublicRepositoryCaches();
  clearAdminDiscoveryCaches();
  revalidateTag('public-archive');

  revalidatePath('/');
  revalidatePath('/browse');
  revalidatePath('/search');
  revalidatePath('/bookmarks');
  revalidatePath('/sitemap.xml');

  if (issueId) {
    revalidatePath(`/issue/${issueId}`);
    revalidatePath(`/read/${issueId}`);
  }
}
