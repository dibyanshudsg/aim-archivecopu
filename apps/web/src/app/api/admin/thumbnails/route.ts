import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure, adminApiFailure } from '@/lib/admin-request';
import { listIssuesMissingCoverFromDb, updateIssueCoverInDb } from '@/lib/db';
import { generateThumbnailFromUrl } from '@/lib/pdf-thumbnail';
import { storageKeyFromUrl } from '@/lib/r2-client';
import { refreshPublicArchiveCaches } from '@/lib/public-cache';
import { beginAdminOperation, settleAdminOperation } from '@/lib/db/admin-accounts';
import { adminMutationRateLimit } from '@/lib/rate-limit';

/**
 * POST /api/admin/thumbnails
 * Generates thumbnails for all issues that don't have one yet.
 * Processes one issue per call (call repeatedly to batch through all).
 */
export async function POST(request: Request) {
  const admin = await verifyAdmin('catalogue.edit');
  if (!admin) return await adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id, 'upload');
  if (limited) return limited;

  // Find issues missing thumbnails
  const issues = await listIssuesMissingCoverFromDb();

  if (issues.length === 0) {
    return NextResponse.json({
      processed: 0,
      remaining: 0,
      message: 'All issues already have thumbnails',
    });
  }

  const issue = issues[0];
  const operation = await beginAdminOperation(admin.id, 'issue.cover_generated', issue.id);

  try {
    const storageKey = storageKeyFromUrl(issue.pdf_url);
    if (!storageKey) {
      await settleAdminOperation(operation, 'issue.cover_generated', false, 'PDF storage key unavailable');
      return NextResponse.json({
        error: `Could not derive storage key from PDF URL for "${issue.title}"`,
      }, { status: 500 });
    }

    const thumbnailUrl = await generateThumbnailFromUrl(issue.pdf_url, storageKey);

    await updateIssueCoverInDb(issue.id, thumbnailUrl);
    refreshPublicArchiveCaches(issue.id);
    await settleAdminOperation(operation, 'issue.cover_generated', true);

    return NextResponse.json({
      processed: 1,
      remaining: issues.length - 1,
      issue: issue.title,
      thumbnailUrl,
    });
  } catch (err) {
    await settleAdminOperation(operation, 'issue.cover_generated', false);
    return adminApiFailure(err, 'Failed to generate thumbnail');
  }
}
