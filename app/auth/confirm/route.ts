import type { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};
const tokenPattern = /^[A-Za-z0-9_-]{16,511}$/;

function target(path: string) {
  return new Response(null, { status: 303, headers: { ...privateHeaders, Location: path } });
}

function validType(value: unknown): value is "invite" | "recovery" {
  return value === "invite" || value === "recovery";
}

export function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (!token || !tokenPattern.test(token) || !validType(type)) return target("/admin/login?error=auth");
  return new Response(
    `<!doctype html>
    <html lang="ar" dir="rtl">
      <meta charset="utf-8">
      <meta name="referrer" content="no-referrer">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>تأكيد حساب نبض النمارق</title>
      <style>
        body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:16px;box-sizing:border-box;background:#0b2131;color:#132d3c;font:1rem/1.7 system-ui,sans-serif}
        main{max-width:26rem;background:#fff;border-radius:16px;padding:24px;box-shadow:0 15px 45px #0004}
        h1{line-height:1.25} button{padding:10px 16px;border:0;border-radius:8px;background:#006c65;color:#fff;font:700 1rem system-ui,sans-serif;cursor:pointer}
        button:focus-visible{outline:3px solid #006c65;outline-offset:3px}
      </style>
      <main>
        <h1>تأكيد رابط الحساب</h1>
        <p>تابع لتعيين كلمة المرور لحسابك في لوحة إدارة نبض النمارق.</p>
        <form action="/auth/confirm" method="post">
          <input type="hidden" name="token_hash" value="${token}">
          <input type="hidden" name="type" value="${type}">
          <button>متابعة التحقق</button>
        </form>
      </main>
    </html>`,
    { headers: { ...privateHeaders, "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const isSameOrigin = origin && (origin === request.nextUrl.origin || request.headers.get("sec-fetch-site") === "same-origin");
  if (!isSameOrigin ||
    !request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) {
    return new Response(null, { status: 403, headers: privateHeaders });
  }
  if (Number(request.headers.get("content-length")) > 2048 || !request.body) return target("/admin/login?error=auth");
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let body = "";
  let bytes = 0;
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    bytes += chunk.value.length;
    if (bytes > 2048) {
      await reader.cancel();
      return target("/admin/login?error=auth");
    }
    body += decoder.decode(chunk.value, { stream: true });
  }

  const form = new URLSearchParams(body + decoder.decode());
  const token_hash = form.get("token_hash");
  const type = form.get("type");
  if (!token_hash || !tokenPattern.test(token_hash) || !validType(type)) return target("/admin/login?error=auth");

  const supabase = await createServerSupabase();
  if (supabase) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) return target("/admin/password");
  }
  return target("/admin/login?error=auth");
}
