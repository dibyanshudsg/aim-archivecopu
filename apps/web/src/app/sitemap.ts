import type { MetadataRoute } from 'next';
import { listSitemapIssues } from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://aimarchive.aurosociety.org';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/browse`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
  ];

  // Dynamic issue pages. Do not fail the whole production build if the
  // deployment environment is missing DB credentials; static URLs are still
  // better than no deployment, and runtime DB-backed routes report their own
  // errors separately.
  const issues = await listSitemapIssues().catch((error) => {
    console.warn('Skipping issue sitemap entries:', error instanceof Error ? error.message : error);
    return [];
  });

  const issuePages: MetadataRoute.Sitemap = (issues || []).map((issue) => ({
    url: `${baseUrl}/issue/${issue.id}`,
    lastModified: new Date(issue.updated_at),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...issuePages];
}
