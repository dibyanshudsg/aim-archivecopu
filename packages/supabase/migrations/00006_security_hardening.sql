-- AIM Archive: Security hardening
-- Applied via Supabase SQL Editor on 2026-05-13 in response to Security Advisor findings.
--
-- 1. Enable RLS on the admins table.
--    Without RLS, the public anon key could INSERT/UPDATE/DELETE rows via PostgREST.
--    Because verifyAdmin() (apps/web/src/lib/admin-auth.ts) only checks that an admins
--    row with the session id exists, an attacker could insert their own admin row and
--    forge a session cookie to bypass auth. All legitimate server access uses the
--    service role key, which bypasses RLS, so no policies are needed.
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- 2. Pin search_path on functions to prevent search-path-hijack hardening warnings.
--    Neither function is SECURITY DEFINER so the risk is low, but pinning makes
--    them deterministic regardless of caller search_path.
ALTER FUNCTION public.update_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.search_issues(TEXT, UUID, INT, INT, INT, INT) SET search_path = public, pg_temp;
