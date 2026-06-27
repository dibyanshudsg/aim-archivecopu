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

  // Dynamic issue pages
  const issues = await listSitemapIssues();

  const issuePages: MetadataRoute.Sitemap = (issues || []).map((issue) => ({
    url: `${baseUrl}/issue/${issue.id}`,
    lastModified: new Date(issue.updated_at),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...issuePages];
}
