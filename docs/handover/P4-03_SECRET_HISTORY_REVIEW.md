# Source and Git-history credential review

Updated 10 October 2026. **Local document/source suitability review is complete; external cleanup limitations remain open.** History cleanup and credential replacement are distinct. The owner explicitly instructed: remove the password from Git and retain the existing login. Credential/session rotation is therefore deferred by owner decision, not authorized for this step. No password values, admin email addresses, cookies or source excerpts containing credentials are included here.

## Findings and evidence

The local `ADMIN_PASSWORD` matches nine historical text blobs: seven versions of `CLAUDE.md` and two versions of `apps/web/src/app/api/admin/auth/route.ts`. Neither current working source nor the checked HEAD/`origin/main` versions of those two files contain that value. Removing a value from current source does not remove Git history or invalidate the credential.

One normal login to the production admin endpoint at **2026-10-08 15:10:35 UTC** returned HTTP 200 using the existing local password and an approved admin identity read from the database. The password is therefore still accepted by the live site. No session cookie was persisted and no further authenticated action was performed. This confirms exposure of an active credential; it does not establish unauthorized use by another person.

The current implementation uses a shared password and signed seven-day sessions. Session signing falls back to `ADMIN_PASSWORD` when `ADMIN_SESSION_SECRET` is absent. The earlier P2-08 hosted variable-name inspection found no separate session secret. Treat both password replacement and session invalidation as required remediation; forged-session testing was not performed.

The local scan covered 101 reachable commits, 323 current text files and 2,242 unique historical text blobs. It skipped 1,266 historical binary/large blobs. General Gitleaks scanning reported zero findings; supplemental exact-value matching found the nine credential-bearing blobs. Eight historical documentation lines were separately flagged for credential review, including the seven matching documentation blobs; the additional mention remains unclassified. A zero general-scanner result is not a clean security verdict.

Sanitized locations, blob IDs and line numbers are retained in ignored `.codex-logs/p4-secrets/audit-redacted.json`. The repeatable audit is `scripts/audit-release-secrets.cjs`. It reads selected local credential files in memory to compare known values, without copying their values into reports. Its nonzero exit indicates findings or review items, not necessarily a runner failure.

Used [Gitleaks v8.30.1](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1), with the Windows x64 archive checked against the published SHA-256 `d29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e`. The ignored local executable is `.codex-logs/p4-secrets/tools/gitleaks-8.30.1/gitleaks.exe`. Run from the repository root:

```powershell
node scripts/audit-release-secrets.cjs '.codex-logs/p4-secrets/tools/gitleaks-8.30.1/gitleaks.exe'
```

Repository visibility remains unverified: unauthenticated GitHub API access returned 404, which cannot distinguish a private repository from an unavailable one. Do not assume either public exposure or guaranteed confidentiality. Existing clones and recovery copies may retain the credential.

The supplied correspondence PDF also contains historical login information and remains private/excluded from source and deployment. Do not include it in the receiving source package. Broader document suitability review remains part of final source reconciliation.

## Ordered remediation

1. **Owner decision: keep the current password for now; clean Git history.** Rotation remains recommended before handover, but must not be performed contrary to this instruction. History cleanup cannot invalidate a credential already copied. Cloudflare permissions are not needed for either operation.
2. Prepare independent, strong `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` values in the approved private recovery location outside the repository. Deliver replacement login details through an agreed private channel to the owner and authorized receiving admins. Never place values in Git, tickets, chat reports or shell arguments/logs.
3. Update the affected Vercel environment configuration and local private configuration. Inspect environment targets first: the existing password targets Production and Preview. Verify the deployed authentication implementation supports a dedicated session secret before relying on it. Replace only affected credentials; this scan supplies no evidence requiring unrelated Turso/R2 credential rotation.
4. Activate the change using the existing deployed release, independently of the unfinished private-PDF candidate. Installed CLI help confirms `vercel redeploy <deploymentId> --target production` rebuilds an existing deployment. Re-inspect the active deployment before execution; the audited baseline is `dpl_5V2XphXmDRLfDB4ku83WkYgeSf7x`. Check redeploy/configuration behavior and build viability before scheduling interruption. Do not deploy the broad dirty workspace merely to change authentication, or restore the exposed password as rollback.
5. Verify new login succeeds, old password fails, a pre-rotation session is rejected and receiving admin access works. Check the intended production alias and any still-accessible older deployment URLs; retire or protect stale deployments that continue accepting old credentials. Record deployment ID, time and results without values. Existing PDF-origin exposure remains a separate open issue.
6. The owner selected a history rewrite. Preserve private recovery evidence and verify every rewritten commit changes only the identified password bytes. Publish only affected branch refs using exact old-commit leases; preserve the dirty workspace and current branch-tip trees. Existing clones must be replaced or separately cleaned before pushing again. This is repository cleanup, not remediation of the live credential's exposure.
7. Rerun source/history checks on the actual delivery candidate, classify remaining review flags, inspect the handover package and record any retained private-history exception. A clean new repository does not erase copies previously shared.

## Limits and status

The audit is a detection aid, not proof that every secret is absent. Exact-value checks cover selected locally configured values of at least eight characters; unknown, transformed or obsolete secrets may be missed. Current scanning uses Git-listed text files. Binary/large historical files, ignored private evidence, reflog-only/dangling objects, unfetched refs and external copies are not comprehensively inspected. Historical object paths are representative paths reported by Git, not a complete list of every rename.

**Initial audit completed:** local scanner and exact-value review, sanitized evidence, one live login verification and remediation plan. Subsequent authorized history cleanup is recorded below. Credential/session replacement remains deferred by owner, and final delivery suitability review remains open.

## Executed Git cleanup and owner decision

The owner subsequently instructed: **"Just remove from the Git. Keep it still present."** Interpreted and executed as retaining the working admin password while removing its literal value from versioned history. Local private configuration and hosted authentication values were not changed; no session invalidation or repeat login was performed.

Used pinned `git-filter-repo` 2.47.0 in an isolated mirror. Replaced only the exact password bytes with a redaction marker. Compared the file inventories and contents across **all 101 mapped commits**: only the nine previously identified blobs changed. Current local HEAD and remote branch-tip trees remain identical to their pre-cleanup versions. No application source release was added by this operation.

| Reference | Before cleanup | After cleanup |
|---|---|---|
| Local `main` | `8aad9b805102a45ed4bc77f3f5b8c6c9938acfa2` | `4c02a99a3ecb7aa17a3be8f0c724c9c6127e676b` |
| GitHub `main` / local `origin/main` | `7d73dce038e178525db16fd615e20365af7eea17` | `e4d860fb7fc540481ab7bf23d768bedd8cbb3c6c` |
| GitHub `codex/github-indexing-2026-09-06` | `2931e21236d39fa7d4b4228667b28a2ccc278861` | `096b231d1c9c26fcf1ae8207d82565bbe01009e0` |

Both remote branches were updated atomically using explicit old-commit force-with-lease checks and their resulting refs were read back from GitHub. No blanket mirror push or branch deletion was used. Local refs, including the historical `refs/original` backup ref, were mapped to sanitized history. Local obsolete reflogs/objects were expired and garbage-collected. The existing Git index and local environment file retained their exact SHA-256 hashes; dirty working files were not checked out or reset. Local HEAD remains nine commits behind GitHub main; the independent source-reconciliation task is not complete.

The final local and isolated history scans checked 1,977 reachable objects, including 887 blobs, and found zero exact matches in blob, commit or tag contents. This scan includes raw binary blob bytes; it does not decode compressed formats. Counts differ from the earlier audit because history/object reachability changed and the earlier scan had text-only exclusions. Do not treat object-count reduction as removal of project files: every mapped commit's file tree was compared, with only the nine authorized content substitutions permitted.

Private pre-rewrite Git bundles were verified under `D:\AIM (Project Directory)\P4-03_git-history_20261008_211613` (initial preparation) and `D:\AIM (Project Directory)\P4-03_git-history_20261008_211820` (final preparation). These intentional recovery copies, like earlier workspace backups, retain historical sensitive content and are not deliverables. Sanitized mappings and operation results are in ignored `.codex-logs/p4-secrets/cleanup-state.json` and `sanitized-v2.git/filter-repo/commit-map`.

Vercel's Git integration was connected. A temporary ignored-build command targeted only the two rewritten remote commit IDs; both resulting builds were confirmed `CANCELED`. The previous ignored-build setting was then restored. The public alias `aim-archive.vercel.app` was verified still pointing to `dpl_5V2XphXmDRLfDB4ku83WkYgeSf7x`. No application deployment replaced the live release. This precaution follows Vercel's [ignored-build behavior](https://vercel.com/docs/project-configuration/project-settings#ignored-build-step).

### Remaining limits and follow-up

- **GitHub pull-request copy remains:** `refs/pull/1/head` still advertises the old `2931e21236d39fa7d4b4228667b28a2ccc278861` history after both branch updates. This is GitHub-managed history, not a branch we can replace by ordinary push. Do not describe the password as erased from all of GitHub. Assess PR #1 and request eligible cached/PR-reference cleanup through GitHub Support if required; no support request was sent. See [GitHub's sensitive-data removal instructions](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).
- Other people's clones, forks, cached views, old deployment source and private backups were not erased. Existing clone users should preserve their own work and obtain a fresh clone or carefully reconcile onto cleaned history; merging/pushing old history can reintroduce the value. No message was sent to collaborators.
- The password remains usable by explicit owner choice. History cleanup does not undo its exposure. ADM-04 remains open for a future coordinated rotation decision; this is not a security sign-off.
- Local document/package suitability review and broader credential checks were completed on 10 October as recorded below. Before sharing the assembled P4-08/P8-08 package, rerun the scanner on that exact candidate and keep intentional private recovery copies excluded.

## Local suitability review, 10 October 2026

**Subsequent assembled-candidate scan:** [P4-08/09 evidence](P4-08_09_CANDIDATE_VERIFICATION.md) records the exact 351-file archive, zero Gitleaks findings and zero known-secret matches across its raw file bytes. That candidate scan is complete. Any later source/document changes or final receiving package need their own scan; old PR/external-copy exposure remains unresolved and rotation remains deferred. Earlier scan counts below remain dated evidence.

Engineering/Codex reviewed the dirty Windows working candidate at local HEAD `4c02a99a3ecb7aa17a3be8f0c724c9c6127e676b`; this is not a release commit or assembled transfer archive. Read-only GitHub lookup confirmed both cleaned branch IDs above and the unchanged old PR #1 ref. Local HEAD remains zero commits ahead and nine behind `origin/main`. No fetch, reset, staging, credential change or deployment was needed.

The repeated offline audit covered 101 reachable commits, 324 current text files and 881 historical text blobs, skipping seven historical binary blobs. Gitleaks reported zero current/history findings and exact comparisons against locally configured secrets found zero matches. Its exit code was 1 because eight documentation mentions require classification: seven contain the history-cleanup redaction marker; blob `0f95fd27036dcb80243dd40f1d82303b69c52135`, line 505, instructs use of `ADMIN_PASSWORD` from the environment and contains no literal password. All eight review flags are classified; the scanner deliberately continues reporting them rather than suppressing future review. The sandbox denied scanner subprocess creation; the same offline command completed through narrow escalation. Existing scanning limits above still apply.

| Material | Suitability and package treatment |
|---|---|
| Active architecture, technical specification, operating guides, tracker and handover evidence | Suitable for the receiving technical source package as preparation records. Preserve dated results and explicit open staging, recovery, security and institutional-acceptance gates. Final operational accuracy remains P4-06/P8-05/06. |
| September release/review records, archive plans, design notes and `vision.md` | Retain as dated evidence or optional design context; they do not authorize new scope. The older website review plan now points to the single active tracker. |
| Handover email draft and earlier request review | Suitable as internal coordination records, not proof of receipt or acceptance. Added notes for the settled 104-issue scope and excluded Dynamic Pages; preserved the historical draft body. The separate Cloudflare request remains unsent. |
| `SUPABASE_STORAGE_VERIFICATION_2026-10-08.json` | Reviewed as a historical asset-verification inventory: object keys, sizes, hashes, rendering results and a private recovery locator, without credential values or object bytes. Suitable for restricted receiving-team evidence; not a public asset-access or complete recovery certificate. |
| Private backup paths and sanitized hashes in handover records | Locators and integrity evidence may accompany the technical package. They do not grant access; recovery files require a separate controlled transfer and must never be copied into source. |
| Supplied correspondence PDF, `.env` files, database snapshots, old Git bundles, browser/agent state, raw logs and preservation manifests | Excluded from source/deployment. Historical correspondence and recovery copies can contain the still-active password. Existing recovery material remains under `D:\AIM (Project Directory)`; no new recovery copy was made. |
| Generated builds, OCR downloads and magazine source PDFs | Excluded by the recorded source/deployment rules; existing required runtime assets, including the PDF.js worker, remain source deliverables. |

Corrected the staging record's reference context so pre-rewrite IDs remain dated evidence rather than current baselines. Package selection must preserve intentional retired-file removals and include reviewed untracked source; neither `git archive HEAD` nor a copy of the whole working folder represents the delivery candidate. Source reconciliation remains P4-01, assembly P4-08, and final receiving package P8-08.

**Disposition:** remaining local P4-03 review is complete, with no additional credential finding. P4-03 stays open for the retained GitHub PR/cached-copy follow-up and final candidate scan. ADM-04 rotation remains deferred; a package-suitability review cannot certify that exposure is resolved. No support request or recipient message was sent.

Final post-edit scan, 10 October: 325 current text files (including the new P4-04 evidence), the same 101 commits/881 historical text blobs and seven historical binary exclusions. Zero Gitleaks findings or known-secret matches; only the same eight classified historical documentation flags remain. Exit 1 therefore represents those review flags, not a newly found credential. This is still a working-candidate scan, not the future assembled transfer package.
