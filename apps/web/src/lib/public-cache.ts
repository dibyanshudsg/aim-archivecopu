import { revalidatePath } from 'next/cache';
import { clearPublicRepositoryCaches } from '@/lib/db';

export function refreshPublicArchiveCaches(issueId?: string): void {
  clearPublicRepositoryCaches();

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
