# Rate limits — deployed 17 October 2026

The web app stores token buckets in Turso so limits are shared across Vercel instances. Identifiers are HMAC-hashed before storage. A denied request returns HTTP 429, `Retry-After` and `Cache-Control: no-store`. The defaults below are bucket capacity and refill period from `apps/web/src/lib/rate-limit.ts`; they are not fixed-window counters. `RATE_LIMIT_SCALE` can multiply application capacities from 0.5 to 5 after deliberate testing. Vercel's separate edge rule is listed last.

| Area | Default per identity |
| --- | --- |
| Public search | 30 requests/minute/IP |
| Public catalogue | 180/minute/IP |
| Public covers | 300/minute/IP |
| Public PDF access | 120/minute/IP |
| Public downloads | 30/minute/IP |
| Public web vitals | 60/minute/IP |
| Admin login | 8 attempts/15 minutes/account and 30/15 minutes/IP |
| Admin reads | 120/minute/admin and 300/minute/IP |
| Admin mutations, all areas combined | 120/minute/admin and 240/minute/IP |
| General Admin mutations | 60/minute/admin |
| Admin uploads | 120/10 minutes/admin |
| Admin indexing starts | 20/hour/admin |
| Admin indexing reviews | 120/10 minutes/admin |
| Admin credential changes | 15/hour/admin |
| Vercel firewall, `/api/admin/auth` | 120/10 minutes/IP; fixed window; return 429 |

The edge login threshold is higher than the application login limits and protects against high-volume floods. The firewall rule ID is in the [security release note](docs/handover/SECURITY_HARDENING_2026-10-17.md). The application also requires matching Origin on Admin mutations and a trusted client-IP ingress outside Vercel production.

**Monitoring and tuning:** Inspect 429 counts, source IPs and legitimate login failures after Society staff use the site from shared networks. Adjust `RATE_LIMIT_SCALE` or the edge rule only with observed evidence and retest successful/denied flows. A live 429 edge boundary was not intentionally forced in production. The Vercel CLI overview returned a plan-related 402 during this handover check; dashboard-based visibility should be confirmed by the receiving operator. Never put credential values into monitoring notes.
