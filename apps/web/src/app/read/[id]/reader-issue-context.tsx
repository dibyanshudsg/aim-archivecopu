'use client';

import { createContext, useContext } from 'react';
import type { ApiIssue } from '@/lib/api';

const ReaderIssueContext = createContext<ApiIssue | null>(null);

export function ReaderIssueProvider({
  issue,
  children,
}: {
  issue: ApiIssue | null;
  children: React.ReactNode;
}) {
  return <ReaderIssueContext.Provider value={issue}>{children}</ReaderIssueContext.Provider>;
}

export function useInitialReaderIssue() {
  return useContext(ReaderIssueContext);
}
