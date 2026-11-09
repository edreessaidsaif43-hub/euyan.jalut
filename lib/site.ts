import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { getDemoContent } from "./demo";
import { PUBLIC_KINDS } from "./site-config";
import { getPublicConfig } from "./supabase/config";
import { normalizeXHandle } from "./x";
export { SECTIONS, KIND_LABELS, arabicDate, sectionForKind, siteOrigin } from "./site-config";

export type Content = {
  id: string;
  kind: string;
  slug: string;
  title: string;
  summary: string | null;
  body: string | null;
  status: string;
  school_year: string | null;
  image_url: string | null;
  image_path: string | null;
  file_path: string | null;
  metadata: Record<string, unknown>;
  start_at: string | null;
  end_at: string | null;
  featured: boolean;
  is_demo: boolean;
  sort_order: number;
  author_id?: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  coverUrl: string | null;
  fileUrl: string | null;
};

export type Settings = Record<string, string | boolean>;
const defaultSettings = {
  school_name: "مدرسة النمارق للتعليم الأساسي",
  brand_name: "نبض النمارق",
  tagline: "مدرستنا تنبض بالعلم والإبداع",
  hero_title: "مدرستنا تنبض|بالعلم والإبداع",
  hero_description: "بوابتكم إلى الحياة المدرسية. تابعوا أخبار النمارق، واكتشفوا مبادرات طلبتنا وإنجازاتهم، وشاركونا رحلة التعلّم.",
  hero_image_url: "",
  hero_image_path: "",
  about_description: "بوابة مدرسة النمارق للتعليم الأساسي في سلطنة عُمان.",
  current_school_year: "",
  contact_email: "",
  contact_phone: "",
  contact_address: "سلطنة عُمان",
  office_hours: "",
  map_url: "",
  school_x_handle: "",
  demo_mode: false,
};

export const demoPreview = process.env.ENABLE_DEMO_PREVIEW === "true" || process.env.NODE_ENV === "development";
export const getPublicClient = cache(() => {
  const config = getPublicConfig();
  if (!config) return null;
  return createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
});

function safePublicImage(url?: string | null) {
  if (!url) return null;
  if (/^\/images\/[a-z0-9][a-z0-9_-]*\.(webp|png|jpe?g|avif)$/i.test(url)) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password ? parsed.href : null;
  } catch {
    return null;
  }
}

function publicFile(path?: string | null) {
  return path ? `/media?path=${encodeURIComponent(path)}` : null;
}

function resolveMedia(row: Omit<Content, "coverUrl" | "fileUrl">): Content {
  return { ...row, coverUrl: publicFile(row.image_path) ?? safePublicImage(row.image_url), fileUrl: publicFile(row.file_path) };
}

export const getPublicSettings = cache(async () => {
  const client = getPublicClient();
  const values: Settings = { ...defaultSettings, school_x_handle: normalizeXHandle(process.env.SCHOOL_X_HANDLE) };
  if (client) {
    const { data, error } = await client.from("site_settings").select("key,value");
    if (error) console.error("Public settings unavailable", error.code);
    for (const row of data ?? []) {
      if (Object.hasOwn(defaultSettings, row.key) && (typeof row.value === "string" || typeof row.value === "boolean")) {
        values[row.key] = row.value;
      }
    }
  } else if (demoPreview) {
    values.hero_image_url = "/images/campus.webp";
    values.current_school_year = "2026/2027";
    values.demo_mode = true;
  }
  return {
    ...values,
    heroImageUrl: publicFile(String(values.hero_image_path || "")) ?? safePublicImage(String(values.hero_image_url || "")) ?? "",
  } as typeof defaultSettings & { heroImageUrl: string } & Settings;
});

type Filters = { kinds?: string[]; year?: string; query?: string; featured?: boolean; limit?: number; offset?: number; upcoming?: boolean };
export async function getPublicContents(filters: Filters = {}): Promise<Content[]> {
  const { kinds = PUBLIC_KINDS, year, featured, limit = 120, offset = 0, upcoming } = filters;
  const query = filters.query?.trim().slice(0, 120);
  const client = getPublicClient();
  if (!client) {
    if (!demoPreview) return [];
    const rows = getDemoContent().filter((row) => kinds.includes(row.kind) &&
      (!year || row.school_year === year) && (featured === undefined || row.featured === featured) &&
      (!upcoming || (row.start_at && row.start_at > new Date().toISOString())) &&
      (!query || `${row.title} ${row.summary} ${row.body}`.includes(query)));
    if (upcoming) rows.sort((a, b) => (a.start_at ?? "").localeCompare(b.start_at ?? ""));
    return rows.slice(offset, offset + limit);
  }
  if (kinds.length === 0) return [];
  let request = client.from("content")
    .select("id,kind,slug,title,summary,body,status,school_year,image_url,image_path,file_path,metadata,start_at,end_at,featured,is_demo,sort_order,created_at,updated_at,published_at")
    .eq("status", "published").in("kind", kinds);
  if (year) request = request.eq("school_year", year);
  if (featured !== undefined) request = request.eq("featured", featured);
  if (upcoming) request = request.gt("start_at", new Date().toISOString()).order("start_at");
  if (query) {
    const pattern = `"%${query.replace(/[\\%_"]/g, "\\$&")}%"`;
    request = request.or(`title.ilike.${pattern},summary.ilike.${pattern},body.ilike.${pattern}`);
  }
  const { data, error } = await request.order("featured", { ascending: false })
    .order("sort_order").order("published_at", { ascending: false }).order("id").range(offset, offset + Math.min(limit, 1000) - 1);
  if (error) console.error("Public content unavailable", error.code);
  return (data ?? []).map(resolveMedia);
}

export async function getPublicSchoolYears(kinds = PUBLIC_KINDS): Promise<string[]> {
  const client = getPublicClient();
  if (!client) {
    if (!demoPreview) return [];
    const years = getDemoContent().filter((row) => kinds.includes(row.kind)).map((row) => row.school_year);
    return [...new Set(years)].filter((year): year is string => Boolean(year)).sort().reverse();
  }
  if (kinds.length === 0) return [];
  const { data } = await client.from("content").select("school_year").eq("status", "published")
    .in("kind", kinds).not("school_year", "is", null).order("school_year", { ascending: false }).limit(1000);
  return [...new Set<string>((data ?? []).map((row) => row.school_year))];
}

export const getPublicContentBySlug = cache(async (slug: string): Promise<Content | null> => {
  const client = getPublicClient();
  if (!client) return demoPreview ? getDemoContent().find((row) => row.slug === slug) ?? null : null;
  const { data } = await client.from("content")
    .select("id,kind,slug,title,summary,body,status,school_year,image_url,image_path,file_path,metadata,start_at,end_at,featured,is_demo,sort_order,created_at,updated_at,published_at")
    .eq("status", "published").eq("slug", slug).maybeSingle();
  return data ? resolveMedia(data) : null;
});
