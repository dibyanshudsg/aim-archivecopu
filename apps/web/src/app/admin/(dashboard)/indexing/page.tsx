import { listIndexingCatalogue } from '@/lib/db/indexing-workspace-repository';
import { IndexingWorkspace } from './workspace';

export const dynamic = 'force-dynamic';
export default async function IndexingPage() {
  return <IndexingWorkspace initial={await listIndexingCatalogue()} />;
}
