# AIM Archive decisions and service inventory

Discussion worksheet, 10 October 2026. Prepared for Mugdhanil and the intended Society receiving team; not sent. Record agreed answers in the [active tracker](../../TO%20DO%20LIST.md), which remains the sole backlog. No answer, spending authority or access grant is presumed by this worksheet.

## Decisions to record

13 October owner update: Society acceptance is reported, and Mugdhanil will continue participating. Immediate request: complete source through Git for Dibyanshu Ji. This supersedes an assumed departure schedule; duration and detailed responsibilities remain to be agreed. Final release acceptance and receiving access still need verification.

| Question | Current position | Answer needed from |
| --- | --- | --- |
| Who coordinates receipt and who owns maintenance, infrastructure/recovery, editorial work, billing and acceptance? | Dibyanshu Ji is the intended coordinator; appointments are unconfirmed | Society, with Kaushal Ji's guidance |
| Retain Vercel or use another web host? Retain Turso or select another database? | Decide separately; migration creates additional implementation and recovery work | Society IT and billing custodian |
| Where should manual indexing run? | Existing GitHub Actions implementation; no scheduled production indexing | Society IT with repository owner |
| Who administers the retained private repository and Actions credentials/usage? | Owner intends to retain repository access for the Society; this does not settle indefinite worker support | Owner and Society IT |
| Which isolated database and private fixture bucket can staging use? | No verified isolated hosted staging environment; spending deferred | Society IT and account custodians |
| Who will handle Cloudflare settings and scoped credentials? | Owner has no dashboard access; Dibyanshu Ji's effective access/action is needed | Dibyanshu Ji or designated storage administrator |
| Who are the authorized admins and what access arrangement should be retained? | Shared password and approved admin identities; current login must stay working until a new instruction | Society and owner |
| Who reviews uncertain cover text and owns future English source delivery? | 17 flagged cover pages need rechecking; Hemlata Di is a source contact, not an appointed ongoing operator | Editorial through Dibyanshu Ji |
| Which subscription, feedback and problem-report destinations are official? | Form copy and receiving links still pending | Receiving editorial/contact owner |
| What backup destination, retention, alerts and cost controls will Society operate? | Verified local database preservation; no institutional operation established | Infrastructure and billing owners |
| What demonstrates acceptance and ends the owner's responsibility? | Independent operation/recovery, agreed exceptions, effective transfer date and finite support period required | Acceptance authority and owner |

## Service and access inventory

Ownership below follows the owner's recorded statements. Receiving sign-in, recovery access and billing must still be verified. Do not share personal account logins or desktop tokens.

| Service | Current owner and purpose | Next receiving action | Private configuration location |
| --- | --- | --- | --- |
| Vercel | Owner; serves web review deployment | Select transfer or replacement; identify team, billing and recovery contacts | Project environment settings; local link identifies `aim-archive` |
| Turso | Owner; authoritative catalogue/search/jobs database | Select retained service or migration; verify independent access and recovery | Vercel environment, local private web environment and GitHub worker secrets |
| Cloudflare R2 | Society; PDFs and covers | Confirm bucket/domain/CORS/cache administration; arrange scoped web and read-only worker credentials | Cloudflare administration; app/worker secret stores |
| GitHub | Owner's `MugdhanilK/aim-archive`; source and manual worker | Collect individual usernames/permissions; verify private visibility; assign Actions billing and secret renewal | Repository access, Actions secrets/variables; web dispatch credential in hosting settings |
| Website admin | Application configuration and database admin list | Confirm authorized admins and coordinated password/session transition | Local private web environment, hosted environment and database admin list |
| Legacy Supabase | Owner; paused legacy service, absent from current local runtime | Keep paused pending reviewed retirement/preservation decision; confirm residual billing | Owner account; preserved legacy material outside repository |
| Google feedback form | Owner's personal form; editor sharing already reported | Dibyanshu Ji creates/manages receiving copy, verifies response preservation and supplies new links | Receiving form/response-sheet accounts; app site settings |
| Website DNS | Preferred Society subdomain; setup deferred | Confirm destination, then arrange DNS/TLS and routing; no domain purchase needed now | Society DNS administration and selected host |
| Backups and alerts | Private local preservation; permanent operation unassigned | Choose receiving storage, schedule, retention, alert recipients and costs | Private recovery location and future Society-controlled services |

Configuration names include `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` and `INDEXING_GITHUB_TOKEN`. Consult [SETUP.md](../../SETUP.md) and the [worker guide](../../GITHUB_INDEXING.md) for complete scopes, including `INDEXING_R2_*` and `INDEXING_TURSO_*`. Names are not values or proof that a variable is configured. The dedicated session secret and hosted dispatch connection remain unverified/unconfigured in the recorded inventory.

Private local web configuration is `apps/web/.env.local`; recovery material belongs under `D:\AIM (Project Directory)`, outside Git. Do not attach those files, raw logs, database snapshots, old Git bundles or the historical correspondence PDF to ordinary discussion mail. Agree a controlled private transfer for necessary recovery files and replacement credentials; a path in a document does not grant access.

## Order of external actions

First confirm contacts, service choices and staging access. Then review and publish the selected source, configure isolated staging, test uploads/private delivery/worker behavior, rehearse recovery and coordinate production changes. Cloudflare origin closure must be coordinated with compatible web and worker releases; do not disable public storage first and assume the old website will keep working.

The existing [Cloudflare request](P2-08_STAGING_READINESS.md#draft-request-to-dibyanshu-ji) remains a draft. The owner reports that the earlier general handover email was sent; that is a different communication. No new message or account action is authorized by preparing this inventory.
