/** Stable application addresses only; never persist expiring storage grants. */
export const publicPdfRoute = (id: string) => `/api/issues/${encodeURIComponent(id)}/pdf`;
export const publicCoverRoute = (id: string) => `/api/issues/${encodeURIComponent(id)}/cover`;
export const magazineCoverRoute = (id: string) => `/api/magazines/${encodeURIComponent(id)}/cover`;
export function isCatalogueCoverRoute(url: string): boolean {
  return /^\/api\/(admin\/)?(issues|magazines)\/[a-zA-Z0-9_-]+\/cover$/.test(url);
}
