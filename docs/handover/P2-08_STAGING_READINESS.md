# P2-08 — Staging readiness and release record

8 October 2026. **In progress; not deployed and not accepted as staging complete.** Read-only hosted checks and local preparation are complete below. No hosted settings, GitHub secrets, source refs, catalogue records or R2 objects were changed.

## Verified baseline

Source-reference update, 10 October 2026: the table records the pre-rewrite 8 October inspection. Fresh read-only checks confirm local HEAD `4c02a99a3ecb7aa17a3be8f0c724c9c6127e676b` and GitHub main `e4d860fb7fc540481ab7bf23d768bedd8cbb3c6c`, still nine commits apart. See [password-only history mapping](P4-03_SECRET_HISTORY_REVIEW.md). The deployment/configuration observations below were not reverified on 10 October; no deployment is authorized by this update.

| Item | Observed result |
|---|---|
| Current Vercel production | Ready deployment `dpl_5V2XphXmDRLfDB4ku83WkYgeSf7x`, created 19 September 2026, serving `aim-archive.vercel.app` |
| Local Git HEAD | `8aad9b805102a45ed4bc77f3f5b8c6c9938acfa2`; substantial modified/untracked source remains outside this commit |
| GitHub main | Read-only `ls-remote` returned `7d73dce038e178525db16fd615e20365af7eea17`; the new worker is not synchronized |
| Preview deployments | Vercel CLI returned no preview deployments in this project scope |
| Preview configuration | Turso, R2 and admin password variable entries target both Preview and Production. No isolated staging values have been verified. Do not run upload/replacement tests against inherited settings |
| Missing hosted configuration | `INDEXING_GITHUB_TOKEN`, dedicated `ADMIN_SESSION_SECRET` and `PDF_DELIVERY_DISABLED` were not listed. Current sessions fall back to `ADMIN_PASSWORD`; changing the session secret needs a planned session transition |
| Legacy hosted configuration | Three Supabase variable names remain in Production; removal remains coordinated with the cleanup deployment under SB-06 |
| Existing local storage credential | Read-only worker preflight passed current English PDF metadata/signature access. It is not proof of the future dedicated GitHub credential or upload permissions |
| Cloudflare settings access | S3 GetBucketCors did not return a readable configuration with the available credential. Dashboard access, attached domains, complete CORS settings and creation of scoped credentials remain unverified |

The production deployment above is an identification baseline, **not a safe rollback release** after public storage is closed. It predates the private delivery work.

## Real storage preflight — passed, with limits

`node scripts/preflight-private-delivery.cjs` ran read-only at `2026-10-08T13:19:59Z`, using one existing English PDF and the local storage credentials. It outputs sanitized results, never signed URLs or credential values.

- Signed GET with `Range: bytes=0-4`: HTTP 206, valid `%PDF-` signature, `application/pdf`, `Cache-Control: private, no-store, max-age=0`.
- Signed HEAD: HTTP 200, PDF MIME. No object Cache-Control header was returned for HEAD; no file bytes were transferred.
- CORS OPTIONS from `https://aim-archive.vercel.app`: HTTP 204, permitted GET/HEAD/PUT. GET/HEAD responses allowed that origin and exposed ETag, Content-Length and Content-Type. This is not a complete CORS configuration inspection, nor a preview-origin/real-browser test. Check Content-Range exposure and actual PDF.js range behavior during staging.
- Tampered signature: HTTP 403. Signature issued six minutes earlier with a five-minute lifetime: HTTP 403.
- Bucket CORS configuration could not be read. No claim that private bucket status, every custom domain or old-origin denial was verified.

These checks prove the current credential/provider support the core signed-read operations. They do not prove the new website deployment, isolated staging, direct uploads, replacement CopyObject, cleanup, dedicated worker credentials or private-origin cutover.

## Candidate and safe fallback

Later source-preparation update, 8 October: Cloudflare request remains pending by owner instruction. The [P4 source reconciliation record](P4_SOURCE_RECONCILIATION.md) contains the refreshed candidate fingerprint, verified exclusion changes and outstanding overlapping-source review. The 274-file fingerprint below is retained as the earlier preparation snapshot, not the current candidate.

`scripts/record-release-candidate.cjs` recorded 274 runtime/operator/test files in `.codex-logs/p2-08/candidate-58059eb58fc2.json`, SHA-256 `58059eb58fc2ed0b738f40793bc350d039b99d39f46f982bcb7e2e059b8053c4`. It includes untracked runtime source but excludes environment files, documents, archive assets and generated builds. This is a source fingerprint, not a deployable archive, commit or complete recovery backup. Regenerate after source changes and record the final reviewed commit/deployment separately. The existing private preservation remains the recovery baseline.

Added `PDF_DELIVERY_DISABLED=1` as a safe operational fallback. With it active, public grants/redirects/downloads and authenticated PDF streams return private/no-store 503 before storage access. HEAD has no body. Covers/metadata remain separate. The flag is included in Turbo's environment allowlist and the example environment file. It is **not set on Vercel**.

All nine local PDF security suites passed including all eight mode/method fallback combinations; the production build passed lint/types and generated 43 static pages. The flag has not been rehearsed on a deployed preview. Applying an environment change requires the host's normal redeploy/restart path; it does not alter running deployments instantly. Existing grants expire independently within five minutes, and downloaded/in-flight bytes cannot be recalled. Pause indexing and admin writes during incident recovery; the flag itself does not stop the worker or uploads. Keep R2 origins private throughout recovery.

## Ordered remaining tasks

- [x] Read current deployment, local/remote revisions and environment target names without exposing values.
- [x] Verify authenticated storage metadata/signature and real signed GET/HEAD, range, current-origin CORS, tampered/expired denial without writes.
- [x] Prepare the candidate source fingerprint and locally tested unavailable-PDF fallback.
- [x] Owner clarification recorded: the owner has no Society Cloudflare dashboard access; Dibyanshu Ji must handle these settings. This identifies the requested contact, not confirmed acceptance or verified permissions.
- [ ] Dibyanshu Ji confirms dashboard access, inventories attached domains/CORS/cache rules and arranges bucket-scoped credentials. Request prepared below; not sent by the assistant.
- [ ] Identify an isolated Turso database and private R2 staging bucket (existing resources if available). Proposed names: `aim-archive-staging`; confirm account/resources before provisioning because spending remains deferred. Use synthetic PDFs/covers and separate admin credentials, not live archive copies. This is functional test data, not the excluded R2 backup.
- [ ] Configure staging-scoped Vercel values, including DB, bucket, storage credentials, locator namespace, app origin and admin secret. Verify target isolation before creating a preview. Do not reuse production-targeted entries for mutation tests. No new public asset domain is required for private S3 delivery.
- [ ] Reconcile the dirty source baseline under P4-01/02, select a reviewable release commit and sync the worker workflow separately. Do not push every untracked workspace file blindly. Keep preservation, secrets and archive assets excluded.
- [ ] Have Society storage administration issue a dedicated bucket-scoped Object Read worker credential. Configure the four `INDEXING_R2_*` secrets and verify GitHub access/source without processing production jobs. Configure web dispatch access separately if using the admin Start control.
- [ ] Deploy the reviewed candidate to the isolated preview; record deployment ID, source fingerprint/commit and settings scope.
- [ ] Run the P2-07 matrix on staging: released/restricted/draft access; actual browser redirects/ranges, idle expiry and retry; uploads/bulk/replacement above the web request-body limit; custom/auto covers; conflicting replacements; private worker extraction and review identity; safe fallback on/off.
- [ ] Verify signed PUT CORS for the actual preview origin and receiving production origin, CopyObject permission, staging cleanup and representative cover/request duration limits. Do not broaden origins unnecessarily.
- [ ] Refresh the current DB recovery snapshot if catalogue data changed since P1-02, preserve the exact release/configuration baseline privately, agree a brief pause of uploads/indexing and rehearse recovery. No separate R2 backup is required by the owner's decision.
- [ ] Coordinate production web/worker release with P2-09 public-origin/cache closure. Verify every known restricted/draft old URL and current public/admin/worker behavior. Record live results and release IDs before closing P2-08/09.

Do not advance to a production rollout based only on the successful signed-read preflight. Cloudflare-dependent steps now await Dibyanshu Ji's confirmation and action; isolated staging resource/account access is still required. Source reconciliation and local release preparation can continue independently. No credential values should be sent in chat.

## Draft request to Dibyanshu Ji

Prepared for the owner to forward; not sent by the assistant.

**Subject: AIM Archive — Cloudflare assistance for testing and handover**

Dear Dibyanshu Ji,

As part of preparing AIM Archive for handover, we have implemented and locally tested changes to protect draft issues and issues within the five-year restriction. Read-only checks against R2 have also passed, including signed PDF access and rejection of expired or altered links. The changes have not yet been deployed.

Since I do not have access to the Society's Cloudflare dashboard, could you please help with the following, or coordinate with the colleague who has the required access?

1. Confirm access to the archive's R2 bucket and share its current public-access, connected-domain and CORS settings, without including any secret keys.
2. Confirm whether an isolated private test bucket is available, or can be arranged for a few synthetic PDFs and covers. We will coordinate the test website origin and required permissions before configuration; no new domain is needed for this test.
3. Help arrange a separate, bucket-scoped read-only credential for the indexing worker. Credentials should be installed directly into the appropriate service settings or transferred through an agreed secure channel, rather than ordinary email or chat. Staging and production access will be kept separate.
4. Once the staging tests pass, coordinate the final change to public bucket/domain access and any required cache invalidation with the website and worker release. Please leave the current access settings unchanged until that coordinated step, so existing readers and indexing do not break.

The Vercel and Turso staging setup and source-code reconciliation are separate preparation tasks; this request concerns the Society's Cloudflare side. Please let me know whether you can handle these steps or need another IT colleague involved.

Thank you for your help.
