import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getPublicConfig } from "./config";

export async function createServerSupabase() {
  const config = getPublicConfig();
  if (!config) return null;

  const cookieStore = await cookies();
  return createServerClient(config.url, config.key, {
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (updates) => {
        try {
          for (const { name, value, options } of updates) cookieStore.set(name, value, options);
        } catch {
          // The session proxy refreshes cookies for Server Components.
        }
      },
    },
  });
}

export function createSupabaseService() {
  const config = getPublicConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!config || !key) return null;

  return createClient(config.url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}
