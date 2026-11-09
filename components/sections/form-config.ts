import "server-only";

export function getSchoolFormConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const secret = process.env.FORM_RATE_LIMIT_SECRET?.trim();
  if (!url || !serviceKey || !secret || secret.length < 32) return null;
  return { url, serviceKey, secret };
}
