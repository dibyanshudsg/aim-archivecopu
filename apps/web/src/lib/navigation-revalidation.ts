import { revalidatePath } from 'next/cache';

const PUBLIC_NAVIGATION_PATHS = ['/', '/browse', '/search', '/bookmarks', '/api/navigation'];

export function revalidateNavigationSurfaces(): void {
  for (const path of PUBLIC_NAVIGATION_PATHS) {
    revalidatePath(path);
  }
}
