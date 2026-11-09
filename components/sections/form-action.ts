"use server";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { cookies, headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { getSchoolFormConfig } from "./form-config";

export type SchoolFormKind = "contact" | "suggestion" | "survey";
export type SchoolFormState = { status: "ready" | "ok" | "error"; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const unavailable = "تعذّر إرسال النموذج حاليًا. يُرجى إعادة المحاولة لاحقًا.";

export async function submitSchoolForm(
  kind: SchoolFormKind,
  surveyId: string | null,
  _previous: SchoolFormState,
  data: FormData,
): Promise<SchoolFormState> {
  const configuration = getSchoolFormConfig();
  if (!configuration || !(data instanceof FormData) || !["contact", "suggestion", "survey"].includes(kind)) {
    return { status: "error", message: unavailable };
  }

  const field = (name: string) => {
    const value = data.get(name);
    return typeof value === "string" ? value.trim() : "";
  };

  const result = {
    status: "ok" as const,
    message: kind === "survey" ? "تم تسجيل إجابتكم. شكرًا لمشاركتكم." : "تم استلام رسالتكم. شكرًا لتواصلكم.",
  };
  if (field("website")) return result;

  const clientToken = field("client_token");
  if (!UUID.test(clientToken)) return { status: "error", message: "أعيدوا تحميل الصفحة ثم حاولوا مجددًا." };

  let payload: Record<string, string> = { client_token: clientToken };
  if (kind === "survey") {
    const option = field("option");
    if (!surveyId || !UUID.test(surveyId) || !option || option.length > 160) {
      return { status: "error", message: "اختاروا إجابة من خيارات الاستبانة." };
    }
    const cookieStore = await cookies();
    const savedToken = cookieStore.get("school_survey")?.value;
    const browserToken = savedToken && UUID.test(savedToken) ? savedToken : clientToken;
    if (browserToken !== savedToken) {
      cookieStore.set("school_survey", browserToken, {
        httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 31536000,
      });
    }
    payload = { survey_id: surveyId, client_token: browserToken, option };
  } else {
    const name = field("name");
    const email = field("email");
    const message = field("message");
    const emailInvalid = email.length > 254 || ((kind === "contact" || Boolean(email)) && !EMAIL.test(email));
    if (name.length < 2 || name.length > 120 || emailInvalid || message.length < 5 || message.length > 2500) {
      return { status: "error", message: "تحقّقوا من الاسم والبريد الإلكتروني ومن أن النص بين ٥ و٢٥٠٠ حرف." };
    }
    payload = { ...payload, name, email, message };
  }

  // Set an explicit trusted header for other hosts only when the reverse proxy overwrites it.
  const requestHeaders = await headers();
  const ipHeader = process.env.VERCEL === "1" ? "x-vercel-forwarded-for" : process.env.FORM_CLIENT_IP_HEADER;
  const candidate = ipHeader && /^[a-z0-9-]+$/i.test(ipHeader) ? requestHeaders.get(ipHeader)?.split(",")[0].trim() : undefined;
  const fingerprint = createHmac("sha256", configuration.secret)
    .update(candidate && isIP(candidate) ? candidate : "shared-fallback")
    .digest("hex");

  try {
    const supabase = createClient(configuration.url, configuration.serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { error } = await supabase.rpc("submit_school_form", {
      p_kind: kind, p_payload: payload, p_fingerprint: fingerprint,
    });

    if (!error) return result;
    if (error.code === "23505") {
      return { ...result, message: kind === "survey" ? "سبق تسجيل مشاركة لهذه الاستبانة." : result.message };
    }
    if (error.code === "22023") {
      return { status: "error", message: kind === "survey" ? "تعذّر قبول الاختيار. حدّثوا الصفحة للاطّلاع على خيارات الاستبانة." : "تحقّقوا من بيانات الرسالة ثم أعيدوا المحاولة." };
    }
    if (error.code === "P0001" && error.message === "rate_limited") {
      return { status: "error", message: "تم بلوغ الحد المؤقت للإرسال. يُرجى المحاولة بعد قليل." };
    }
    console.error("School form submission failed", error.code);
  } catch {
    console.error("School form submission request failed");
  }
  return { status: "error", message: unavailable };
}
