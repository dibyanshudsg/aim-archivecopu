const warmedIssueDetailRoutes = new Set<string>();

export function issueDetailPath(issueId: string) {
  return `/issue/${issueId}`;
}

/**
 * Next prefetches visible links in production. Local development deliberately
 * skips that work, so an intent-triggered request prevents the first Details
 * click from waiting for the dynamic route to compile.
 */
export function warmIssueDetailRoute(issueId: string) {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') return;
  const href = issueDetailPath(issueId);
  if (warmedIssueDetailRoutes.has(href)) return;
  warmedIssueDetailRoutes.add(href);
  fetch(href, { cache: 'force-cache' }).catch(() => warmedIssueDetailRoutes.delete(href));
}
