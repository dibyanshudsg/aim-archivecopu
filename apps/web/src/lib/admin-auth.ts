import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const ADMIN_COOKIE = 'aim-admin-session';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function verifyAdmin(): Promise<{ id: string; email: string; name: string } | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE);
  if (!session?.value) return null;

  try {
    const parsed = JSON.parse(atob(session.value));
    const supabase = getAdminClient();
    const { data } = await supabase
      .from('admins')
      .select('id, email, name')
      .eq('id', parsed.id)
      .single();
    return data;
  } catch {
    return null;
  }
}

export function createSessionToken(admin: { id: string; email: string }) {
  return btoa(JSON.stringify({ id: admin.id, email: admin.email, ts: Date.now() }));
}

export { ADMIN_COOKIE };
