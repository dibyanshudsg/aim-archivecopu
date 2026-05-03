import { createPublicClient } from '@/lib/supabase-server';
import type { ApiMagazine } from '@/lib/api';
import { SearchClient } from './search-client';

// ISR: cache the search shell HTML for a minute. The search itself stays
// fully dynamic on the client — only the page chrome and magazine filter
// list are pre-rendered.
export const revalidate = 60;

async function fetchMagazinesServer(): Promise<ApiMagazine[]> {
  const supabase = createPublicClient();
  const { data } = await supabase.from('magazines').select('*').order('name');
  return (data ?? []) as ApiMagazine[];
}

export default async function SearchPage() {
  const magazines = await fetchMagazinesServer();
  return <SearchClient initialMagazines={magazines} />;
}
