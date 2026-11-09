"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase, createSupabaseService } from "@/lib/supabase/server";
import { normalizeXHandle, normalizeXPostUrl } from "@/lib/x";
import { getStaff, requireStaff } from "./access";
import { errors, kinds, mediaUploadMiB, ownKey, roles, settingLabels, statuses } from "./model";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9ء-ي٠-٩]+(?:-[a-z0-9ء-ي٠-٩]+)*$/u;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const bucket = "school-media";

const allowedFiles: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/avif": ["avif"],
  "application/pdf": ["pdf"],
  "video/mp4": ["mp4"],
  "video/webm": ["webm"],
};

function field(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function outcome(path: string, error?: keyof typeof errors): never {
  redirect(path + (path.includes("?") ? "&" : "?") + (error ? "error=" + error : "saved=1"));
}

function errorCode(error: { code?: string } | null): keyof typeof errors {
  return error?.code === "23505" ? "conflict" : error?.code === "42501" ? "permission" : "save";
}

function safeWebLink(input: string, localImage = false) {
  if (!input) return "";
  if (localImage && /^\/images\/[a-z0-9_.-]+$/i.test(input)) return input;
  try {
    const parsed = new URL(input);
    if (parsed.protocol === "https:" && !parsed.username && !parsed.password) return parsed.href;
  } catch {
    // The form field must contain an absolute HTTPS URL.
  }
  return null;
}

function muscatTime(value: string) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
  const date = new Date(value + ":00+04:00");
  return Number.isNaN(date.valueOf()) ? false : date.toISOString();
}

function refreshPublic() {
  revalidatePath("/", "layout");
}

export async function login(form: FormData) {
  const supabase = await createServerSupabase();
  const email = field(form, "email").toLowerCase();
  const password = form.get("password");
  if (!supabase || !emailPattern.test(email) || email.length > 254 || typeof password !== "string" || !password || password.length > 256) {
    outcome("/admin/login", "login");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) outcome("/admin/login", "login");
  const staff = await getStaff();
  if (!staff) {
    await supabase.auth.signOut({ scope: "local" });
    outcome("/admin/login", "login");
  }
  redirect("/admin");
}

export async function resetPassword(form: FormData) {
  const supabase = await createServerSupabase();
  const email = field(form, "email").toLowerCase();
  if (!supabase || !emailPattern.test(email) || email.length > 254) outcome("/admin/login?reset=1", "missing");
  await supabase.auth.resetPasswordForEmail(email);
  redirect("/admin/login?reset=1&sent=1");
}

export async function changePassword(form: FormData) {
  const staff = await requireStaff();
  const password = form.get("password");
  if (typeof password !== "string" || password.length < 12 || password.length > 128 || password !== form.get("confirm")) {
    outcome("/admin/password", "password");
  }
  const { error } = await staff.supabase.auth.updateUser({ password });
  if (error) outcome("/admin/password", "save");
  outcome("/admin");
}

export async function logout() {
  const supabase = await createServerSupabase();
  await supabase?.auth.signOut({ scope: "local" });
  redirect("/admin/login");
}

export async function saveContent(_state: { error?: keyof typeof errors }, form: FormData): Promise<{ error?: keyof typeof errors }> {
  const staff = await requireStaff();
  const id = field(form, "id");
  const updatedAt = field(form, "updated_at");
  if (id && !uuidPattern.test(id)) return { error: "missing" };
  const path = "/admin/content/" + (id || "new");
  const kind = field(form, "kind");
  const title = field(form, "title");
  const slug = field(form, "slug").normalize("NFC").toLowerCase();
  const status = field(form, "status");
  const summary = field(form, "summary");
  const body = field(form, "body");
  const schoolYear = field(form, "school_year");
  const imageUrl = safeWebLink(field(form, "image_url"), true);
  const imagePath = field(form, "image_path");
  const filePath = field(form, "file_path");
  const startAt = muscatTime(field(form, "start_at"));
  const endAt = muscatTime(field(form, "end_at"));
  const sortOrder = Number(field(form, "sort_order") || 0);
  if (
    !ownKey(kinds, kind) || !ownKey(statuses, status) || !title || title.length > 180 ||
    !slug || slug.length > 140 || !slugPattern.test(slug) ||
    summary.length > 600 || body.length > 40000 || imageUrl === null || imageUrl.length > 2000 ||
    !/^\d{4}[-/]\d{4}$/.test(schoolYear) ||
    startAt === false || endAt === false || (endAt && (!startAt || endAt < startAt)) ||
    !Number.isInteger(sortOrder) || sortOrder < -9999 || sortOrder > 9999 ||
    (id && !updatedAt)
  ) return { error: "missing" };
  if (!staff.canManage && status === "published") return { error: "permission" };

  const metadata: Record<string, unknown> = {};
  const alt = field(form, "alt");
  const location = field(form, "location");
  const audience = field(form, "audience");
  const externalUrl = safeWebLink(field(form, "external_url"));
  const videoUrl = safeWebLink(field(form, "video_url"));
  if (alt.length > 250 || location.length > 200 || audience.length > 200 || externalUrl === null || videoUrl === null) return { error: "missing" };
  if (alt) metadata.alt = alt;
  if (location && (kind === "event" || kind === "calendar")) metadata.location = location;
  if (audience && kind === "schedule") metadata.audience = audience;
  if (externalUrl && ["resource", "parent", "partnership"].includes(kind)) metadata.external_url = externalUrl;
  if (videoUrl && kind === "gallery") metadata.video_url = videoUrl;
  if (kind === "news" || kind === "announcement") {
    const post = field(form, "x_post_url");
    const postUrl = normalizeXPostUrl(post);
    if (post && !postUrl) return { error: "xPost" };
    if (postUrl) metadata.x_post_url = postUrl;
  }
  if (kind === "survey") {
    const options = field(form, "options").split(/\r?\n/).map((option) => option.trim()).filter(Boolean);
    if ((status === "published" && options.length < 2) || (options.length > 0 && options.length < 2) || options.length > 12 || new Set(options).size !== options.length || options.some((option) => option.length > 160)) {
      return { error: "missing" };
    }
    if (options.length) metadata.options = options;
  }
  if (kind === "stat") {
    const raw = field(form, "value");
    const value = Number(raw);
    const label = field(form, "label") || title;
    const icon = field(form, "icon") || "users";
    if (!raw || !Number.isFinite(value) || value < 0 || value > 100000000 || label.length > 120 || !/^[a-z-]{1,30}$/.test(icon)) {
      return { error: "missing" };
    }
    Object.assign(metadata, { value, label, icon });
  }

  const { data: existing, error: lookupError } = id
    ? await staff.supabase.from("content").select("author_id,status,image_path,file_path,start_at,end_at,kind").eq("id", id).maybeSingle()
    : { data: null, error: null };
  if (id && (lookupError || !existing || (!staff.canManage && (existing.author_id !== staff.user.id || existing.status === "published")))) {
    return { error: "permission" };
  }

  const requested = [...new Set([
    imagePath !== existing?.image_path ? imagePath : "",
    filePath !== existing?.file_path ? filePath : "",
  ].filter(Boolean))];
  if (requested.length) {
    const { data, error } = await staff.supabase.from("media").select("path,mime_type")
      .eq("removal_pending", false).in("path", requested);
    if (error || data?.length !== requested.length ||
      (imagePath && imagePath !== existing?.image_path &&
        !data.some((asset) => asset.path === imagePath && asset.mime_type.startsWith("image/")))) {
      return { error: "media" };
    }
  }

  const fields = {
    kind, title, slug, status, metadata, summary, body,
    school_year: schoolYear, image_url: imagePath ? null : imageUrl || null,
    image_path: imagePath || null, file_path: filePath || null, start_at: kind === existing?.kind && !["event", "calendar", "survey"].includes(kind) ? existing.start_at : startAt,
    end_at: kind === existing?.kind && !["event", "calendar", "survey"].includes(kind) ? existing.end_at : endAt,
    featured: form.has("featured"), is_demo: form.has("is_demo"), sort_order: sortOrder,
  };

  if (id) {
    const { data, error } = await staff.supabase.from("content")
      .update(fields).eq("id", id).eq("updated_at", updatedAt).select("id").maybeSingle();
    if (error || !data) return { error: error ? errorCode(error) : "conflict" };
    refreshPublic();
    outcome(path);
  }

  const { data, error } = await staff.supabase.from("content")
    .insert(fields).select("id").single();
  if (error || !data) return { error: errorCode(error) };
  refreshPublic();
  outcome("/admin/content/" + data.id);
}

export async function deleteContent(form: FormData) {
  const staff = await requireStaff();
  const id = field(form, "id");
  const updatedAt = field(form, "updated_at");
  if (!uuidPattern.test(id) || !updatedAt) outcome("/admin", "missing");
  const path = "/admin/content/" + id;
  const { data: existing } = await staff.supabase.from("content")
    .select("author_id,status").eq("id", id).maybeSingle();
  if (!existing || (!staff.canManage && (existing.author_id !== staff.user.id || existing.status !== "draft"))) outcome(path, "permission");
  const { data, error } = await staff.supabase.from("content").delete()
    .eq("id", id).eq("updated_at", updatedAt).select("id").maybeSingle();
  if (error || !data) outcome(path, error ? errorCode(error) : "conflict");
  refreshPublic();
  outcome("/admin");
}

export async function uploadMedia(form: FormData) {
  const staff = await requireStaff();
  const path = "/admin?view=media";
  const file = form.get("file");
  const title = field(form, "title");
  const alt = field(form, "alt_text");
  if (!(file instanceof File) || !file.size || file.size > mediaUploadMiB * 1024 ** 2 || !title || title.length > 160 || alt.length > 250) {
    outcome(path, "media");
  }
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedFiles[file.type]?.includes(extension)) outcome(path, "media");

  const magic = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const text = new TextDecoder().decode(magic);
  const hasMagic = {
    "image/jpeg": magic[0] === 255 && magic[1] === 216 && magic[2] === 255,
    "image/png": magic[0] === 137 && text.slice(1, 4) === "PNG",
    "image/webp": text.startsWith("RIFF") && text.includes("WEBP"),
    "image/avif": text.includes("ftypavif") || text.includes("ftypavis"),
    "application/pdf": text.startsWith("%PDF-"),
    "video/mp4": text.includes("ftyp"),
    "video/webm": magic[0] === 26 && magic[1] === 69 && magic[2] === 223 && magic[3] === 163,
  }[file.type];
  if (!hasMagic) outcome(path, "media");

  const objectPath = staff.user.id + "/" + crypto.randomUUID() + "." + extension;
  const { error: uploadError } = await staff.supabase.storage.from(bucket).upload(objectPath, file, {
    contentType: file.type,
    cacheControl: "60",
    upsert: false,
  });
  if (uploadError) outcome(path, "media");
  const { error } = await staff.supabase.from("media").insert({
    bucket, path: objectPath, title, alt_text: alt,
    mime_type: file.type, size_bytes: file.size,
  });
  if (error) {
    await staff.supabase.storage.from(bucket).remove([objectPath]);
    outcome(path, errorCode(error));
  }
  outcome(path);
}

export async function updateMedia(form: FormData) {
  const staff = await requireStaff();
  const path = "/admin?view=media";
  const id = field(form, "id");
  const title = field(form, "title");
  const alt = field(form, "alt_text");
  if (!uuidPattern.test(id) || !title || title.length > 160 || alt.length > 250) outcome(path, "missing");
  let query = staff.supabase.from("media").update({ title, alt_text: alt }).eq("id", id);
  if (!staff.canManage) query = query.eq("uploaded_by", staff.user.id);
  const { data, error } = await query.select("id").maybeSingle();
  if (error || !data) outcome(path, error ? errorCode(error) : "permission");
  refreshPublic();
  outcome(path);
}

export async function deleteMedia(form: FormData) {
  const staff = await requireStaff();
  const path = "/admin?view=media";
  const id = field(form, "id");
  if (!uuidPattern.test(id)) outcome(path, "missing");
  const { data: objectPath, error: markError } = await staff.supabase.rpc("school_mark_media_for_removal", { p_id: id });
  if (markError || typeof objectPath !== "string") outcome(path, markError?.code === "42501" ? "permission" : "media");

  const { error: storageError } = await staff.supabase.storage.from(bucket).remove([objectPath]);
  if (storageError) outcome(path, "media");
  const { data, error } = await staff.supabase.from("media").delete().eq("id", id).select("id").maybeSingle();
  if (error || !data) outcome(path, error ? errorCode(error) : "permission");
  refreshPublic();
  outcome(path);
}

export async function saveSettings(form: FormData) {
  const staff = await requireStaff();
  const path = "/admin?view=settings";
  if (!staff.isAdmin) outcome(path, "permission");
  const handleInput = field(form, "school_x_handle");
  const handle = normalizeXHandle(handleInput);
  if (handleInput && !handle) outcome(path, "xHandle");
  const fields = Object.keys(settingLabels).filter((key) => key !== "school_x_handle" || form.has(key)).map((key) => {
    const value = field(form, key);
    return { key, value: key === "demo_mode" ? form.has(key) : key === "school_x_handle" ? handle : value };
  });
  const schoolYear = field(form, "current_school_year");
  const email = field(form, "contact_email");
  const imagePath = field(form, "hero_image_path");
  if (
    !field(form, "school_name") || !field(form, "brand_name") ||
    fields.some(({ value }) => typeof value === "string" && value.length > 1200) ||
    (email && !emailPattern.test(email)) || !/^\d{4}[-/]\d{4}$/.test(schoolYear) ||
    safeWebLink(field(form, "hero_image_url"), true) === null || safeWebLink(field(form, "map_url")) === null
  ) outcome(path, "missing");
  if (imagePath) {
    const { data } = await staff.supabase.from("media").select("id")
      .eq("path", imagePath).like("mime_type", "image/%").maybeSingle();
    if (!data) outcome(path, "media");
  }
  const { data: saved, error: lookupError } = await staff.supabase.from("site_settings").select("key,value");
  if (lookupError) outcome(path, "load");
  const current = new Map(saved.map(({ key, value }) => [key, value]));
  const changes = fields.filter(({ key, value }) => current.get(key) !== value);
  if (!changes.length) outcome(path);
  const { error } = await staff.supabase.from("site_settings").upsert(changes, { onConflict: "key" });
  if (error) outcome(path, errorCode(error));
  refreshPublic();
  outcome(path);
}

export async function inviteUser(form: FormData) {
  const staff = await requireStaff();
  const path = "/admin?view=users";
  if (!staff.isAdmin) outcome(path, "permission");
  const email = field(form, "email").toLowerCase();
  const name = field(form, "display_name");
  const role = field(form, "role");
  if (!emailPattern.test(email) || email.length > 254 || !name || name.length > 100 || !ownKey(roles, role) || role === "visitor") outcome(path, "missing");
  const service = createSupabaseService();
  if (!service) outcome(path, "service");

  const { data, error } = await service.auth.admin.inviteUserByEmail(email, { data: { display_name: name } });
  if (error || !data.user) outcome(path, "email");
  const { data: profile, error: profileError } = await staff.supabase.from("profiles")
    .update({ role, display_name: name }).eq("id", data.user.id).select("id").maybeSingle();
  if (profileError || !profile) outcome(path, "save");
  outcome(path);
}

export async function updateUser(form: FormData) {
  const staff = await requireStaff();
  const path = "/admin?view=users";
  if (!staff.isAdmin) outcome(path, "permission");
  const id = field(form, "id");
  const role = field(form, "role");
  const name = field(form, "display_name");
  if (!uuidPattern.test(id) || !name || name.length > 100 || !ownKey(roles, role)) outcome(path, "missing");

  const { data, error } = await staff.supabase.from("profiles")
    .update(id === staff.user.id ? { display_name: name } : { display_name: name, role })
    .eq("id", id).select("id").maybeSingle();
  if (error || !data) outcome(path, error ? errorCode(error) : "permission");
  outcome(path);
}

export async function updateSubmission(form: FormData) {
  const staff = await requireStaff();
  const path = "/admin?view=inbox";
  const id = field(form, "id");
  const status = field(form, "status");
  if (!staff.canManage) outcome(path, "permission");
  if (!uuidPattern.test(id) || !["new", "read", "resolved", "delete"].includes(status)) outcome(path, "missing");
  const collection = staff.supabase.from("submissions");
  const query = status === "delete" ? collection.delete() : collection.update({ status });
  const { data, error } = await query.eq("id", id).select("id").maybeSingle();
  if (error || !data) outcome(path, error ? errorCode(error) : "permission");
  outcome(path);
}
