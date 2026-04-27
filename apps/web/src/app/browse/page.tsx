import { Suspense } from 'react';
import { BrowseClient } from './browse-client';

export default function BrowsePage() {
  return (
    <Suspense fallback={null}>
      <BrowseClient />
    </Suspense>
  );
}
