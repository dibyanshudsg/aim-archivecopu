import { createClient as supabaseCreateClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Browser/client-side Supabase client */
export function createClient() {
  return supabaseCreateClient<Database>(supabaseUrl, supabaseAnonKey);
}

/** Server-side Supabase client (uses service role key for admin operations) */
export function createServerClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return supabaseCreateClient<Database>(supabaseUrl, serviceRoleKey);
}
