import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

export function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = { matcher: ["/admin/:path*"] };
