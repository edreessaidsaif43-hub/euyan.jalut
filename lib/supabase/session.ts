import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicConfig } from "./config";

export async function updateSession(request: NextRequest) {
  const config = getPublicConfig();
  let response = NextResponse.next({ request });
  if (!config || !request.cookies.getAll().some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name))) {
    return response;
  }

  const supabase = createServerClient(config.url, config.key, {
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (updates) => {
        for (const { name, value } of updates) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of updates) response.cookies.set(name, value, options);
        response.headers.set("Cache-Control", "private, no-store");
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}
