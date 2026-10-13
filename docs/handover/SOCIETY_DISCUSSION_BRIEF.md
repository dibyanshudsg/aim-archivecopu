# AIM Archive discussion brief

Prepared for Mugdhanil, Dibyanshu Ji and Society IT. Updated 13 October 2026: owner reports Society acceptance and will continue participating. Today's request is complete reviewed Git source for Dibyanshu Ji. Detailed operating appointments, repository access and final technical acceptance remain open. This document has not been sent by the assistant.

## What is ready to discuss

AIM Archive is a working web archive with browsing, English indexed search, PDF reading, downloads, local bookmarks/history and administration for catalogue, uploads and indexing. The website is deployed for review but has not officially launched. The owner accepts the existing **104 issues: 102 English AIM and 2 Hindi Agnishikha** as sufficient handover coverage. Society acknowledgement is still needed.

New ingestion focuses on English AIM. Existing Hindi issues remain available; new Agnishikha uploads are paused. Hindi OCR, native-app completion, Dynamic Pages, additional historical ingestion and EPUB/MOBI conversion are outside the agreed preparation scope. Bookmarks/history are browser-local, without cross-device sync.

## What is verified and what is pending

| Area | Verified preparation | Remaining boundary |
| --- | --- | --- |
| Website | Existing review deployment; locally tested reader/search/admin improvements | Current candidate has not been deployed; final desktop/phone, accessibility and operating checks remain |
| PDF protection | Private-delivery implementation and nine isolated security suites passed | Isolated staging, Cloudflare origin/cache closure and live denial checks are essential before claiming protection complete |
| Source and CI | Reviewed source package, fresh Linux install, build, lint/types, native PDF/OCR and isolated CI script passed | Release commit/push, first hosted CI run and worker synchronization remain |
| Dependencies | Compatible web/root patches passed the recorded 10 October checks | Native skeleton/tooling advisories and framework support planning remain open |
| Recovery | Fresh 13 October snapshot and offline restore passed all 31 table/schema, integrity/FK and FTS checks; 2.360 seconds for local restore/verification | Full application/storage recovery and receiving demonstration remain open; local timing is not end-to-end RTO |
| Editorial work | Existing catalogue accepted by owner; English indexing implemented | Reconfirm and resolve 17 flagged cover pages, final catalogue snapshot and future editorial ownership |

The last verified public deployment is the September release. The newer local package is a candidate, not the code certified to be serving the public address. The [document index](SOCIETY_DOCUMENT_INDEX.md) identifies dated evidence and source-package identity.

## Security limitations for the discussion

Restricted/draft PDF protection must be checked at storage origins as well as application routes. The old public-origin bypass has not been certified closed. Cloudflare settings require Dibyanshu Ji's access or action; the prepared request remains pending and unsent.

The current admin password appeared in historical Git content. Password-only branch cleanup was performed, but old PR references, clones, caches and private backups may retain it. The owner has explicitly deferred password/session replacement to keep the current login working. No clean package scan establishes complete erasure or resolves copied credentials. Agree a coordinated credential transition before closure; do not circulate credentials in these documents.

No separate R2 backup is requested during preparation. The private workspace copy is on the same drive and does not protect against drive failure. Society IT must choose its ongoing recovery/retention arrangements; these are not established by the current local backups.

## Outcomes sought from the first conversation

1. Confirm the receiving coordinator and the technical, infrastructure, editorial, billing and acceptance responsibilities. One person may hold several responsibilities; none is assigned merely by being copied on correspondence.
2. Confirm the web-only product and existing catalogue scope, then decide hosting, database and worker arrangements separately. Moving everything to DigitalOcean is not a prerequisite.
3. Arrange Cloudflare help and isolated staging resources so private delivery can be tested without changing live catalogue data.
4. Agree how receiving access, operational demonstrations, acceptance and a finite transition period will be coordinated.

Use the [decisions and service inventory](SOCIETY_DECISIONS_AND_SERVICES.md) during the meeting. Dates remain to be agreed. The owner's hoped-for 24 November 2026 launch is an aspiration, not a readiness waiver or responsibility-transfer date. Beginning of 2027 is a tentative personal-resource transition preference, not an automatic shutdown deadline.

## Work that can continue independently

Engineering can continue the dependency/support review, login/API security review, local restore rehearsal, quality checks and operator documentation. Hosted mutation tests need isolated service configuration; production cutover needs coordinated access and a reviewed release. Society decisions do not prevent independent local preparation, and unfinished hosted work does not prevent this discussion.

This is a discussion brief, not acceptance or a launch-readiness certificate. The [active tracker](../../TO%20DO%20LIST.md) remains the only task-status record.
