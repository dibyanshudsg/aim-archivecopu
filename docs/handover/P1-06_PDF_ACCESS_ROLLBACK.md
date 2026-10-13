# Immediate rollback approach for PDF access

Prepared 8 October 2026. P1-06 documents the recovery approach; implementation, staging rehearsal and deployment remain Phase 2 tasks. No storage access has been changed.

## Required safety property

P2-08 preparation update, 8 October: local source now supports `PDF_DELIVERY_DISABLED=1`, tested to return uncached 503 for new public/admin PDF delivery before storage access. It is not configured on the hosted service and has not been rehearsed in staging. [Current readiness and limits](P2-08_STAGING_READINESS.md) supersede implementation assumptions in the original preparation steps below. Do not roll back to the September deployment after closing public origins; it still depends on public delivery.

Recovery must preserve denial of draft and five-year-restricted PDFs. The existing publicly readable R2 origin is not a safe rollback destination after protection begins. If no tested secure release is available, temporarily stop PDF delivery while repairing the fault. Do not restore public bucket access to recover reading.

## Before cutover

1. Complete P2-01's delivery design and map every PDF reader, download, preview, ZIP, local file route, worker and cache. Authorize by catalogue identity, publication state and the five-year IST boundary; privileged access requires authenticated authorization.
2. Record exact compatible web and worker revisions, deployed release identifiers, configuration names and private configuration snapshots. Current local cleanup is not deployed, and source/deployment reconciliation remains open under Phase 4; do not assume current Git HEAD reproduces production.
3. Refresh the database backup and read-only object-reference inventory if data changed. Pause admin writes and manual indexing during cutover; drain active jobs. Keep existing object keys and bytes in place for this access-only change. No object backup is required by the owner's P1-03 decision.
4. Prepare and test authenticated worker and thumbnail access: current implementations fetch public PDF URLs. PDFs and covers share the bucket, so blanket public-access removal also affects covers unless delivery is adapted first.
5. Obtain the necessary Society Cloudflare administrator access and record who can execute/reverse each configuration step. This access is not yet verified. Record all public origins, custom domains and controlled caches privately.
6. Prepare either a tested secure rollback release or a tested temporary PDF-unavailable response. Keep the unauthenticated local `/api/pdf` path disabled or securely gated throughout. Test released, restricted and draft fixtures before production cutover.

## Failure and recovery sequence

1. Trigger recovery on unauthorized PDF bytes, broken released reading/downloads, or failed admin/worker access. Stop affected jobs and writes. On leakage, deny the affected delivery paths immediately rather than waiting for an application rollback.
2. Keep direct PDF origins denied. Restore only a release/configuration combination verified to operate with private assets. Otherwise retain temporary PDF unavailability and repair forward; website metadata/covers may remain available where safely supported.
3. Prefer application/configuration recovery over database restoration. Do not overwrite newer records with the P1 snapshot. If data recovery is necessary, restore into an isolated database, compare intervening changes and explicitly plan their preservation before switching.
4. Verify anonymous GET, HEAD and Range denial for draft/restricted IDs and known old URLs; verify released reading/ranges/downloads, authenticated admin operations and worker extraction. Check publication changes and shared-cache behavior. Resume writes/jobs only after those checks pass.
5. Record the failure, deployed revisions, configuration changes, test evidence and any data delta in the active tracker. A later normal deployment must retain the same access guarantees.

## Origin and cache controls

Cloudflare's `r2.dev` and custom-domain public access are independent. Disabling or protecting one does not disable the others; protection on a custom domain does not protect a still-public `r2.dev` endpoint. Inspect every origin before declaring denial complete. [Cloudflare public-bucket documentation](https://developers.cloudflare.com/r2/buckets/public-buckets/).

Purge or deny cached restricted responses on infrastructure under our control and verify the old URLs. Previously downloaded copies cannot be recalled. Domain/CDN enhancements may remain deferred, but they cannot defer closing the existing PDF bypass.

## Evidence and remaining work

The [workspace copy](P1-01_WORKSPACE_PRESERVATION.md), [database backup](P1-02_TURSO_BACKUP.md) and [originals/reference checks](P1-04_05_PRESERVATION_CHECKS.md) provide the baseline. P1-06 is complete as documentation only. P2-01/02 determine the concrete route/configuration sequence; P2-07/08/09 must test and execute it. Phase 3 covers application/database restoration, and Phase 9 covers final release acceptance.
