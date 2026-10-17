# Security hardening — 17 October 2026

## Hosting firewall

Vercel project `aim-archive` has one published custom WAF rule:

- Rule: `AIM admin login edge limit` (`rule_aim_admin_login_edge_limit_6yO10Q`)
- Match: path equals `/api/admin/auth`
- Fixed window: 120 requests per 600 seconds per IP; return HTTP 429 after the threshold.
- This edge threshold catches high-volume traffic. The application's account and IP login limits are stricter and remain authoritative.

Review Vercel Firewall traffic and 429 responses after launch and after shared Society-network use. If legitimate users are affected, inspect source IPs and application login failures before tuning the threshold. The Hobby plan provides one custom rate-limit rule; other routes use the existing application limits.

## Application changes

- A Content Security Policy now restricts script, style, image, connection, worker, frame, and form sources. Inline Next.js bootstrap scripts and styles remain allowed until a nonce-based rendering change is tested.
- Admin JSON mutations enforce route-specific byte limits (1–64 KiB). Invalid JSON returns 400; excess bodies return 413. PDF/cover multipart uploads retain their separate upload constraints.
- Public issue-list failures and remaining Admin navigation/settings/indexing failures no longer return raw exception messages to clients.

## Verification

- `scripts/test-request-body-limits.cjs`: declared and actual oversize, invalid and null JSON.
- TypeScript check and Next.js 15.5.28 production build completed. The isolated checkout's ESLint dependency was incomplete; rerun clean Linux CI after source synchronization.
- Local production HTTP smoke: Home, Browse, Search, Bookmarks, Admin login, and `/api/issues` returned 200 with CSP headers.
- Vercel WAF rule was published and read back enabled. A 429 at the edge has not been forced with live traffic; monitor Firewall analytics before adjusting the threshold.
