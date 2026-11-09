"use client";

import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { Save, Trash2 } from "lucide-react";
import { saveContent, deleteContent } from "@/app/admin/actions";
import { errors, kinds, statuses, type Content, type Kind, type Media } from "@/app/admin/model";
import { Submit } from "./submit";

function localTime(value: string | null | undefined) {
  return value ? new Date(new Date(value).getTime() + 4 * 60 * 60 * 1000).toISOString().slice(0, 16) : "";
}

function MediaPicker({ assets, name, path, label }: {
  assets: Media[];
  name: string;
  path?: string | null;
  label: string;
}) {
  return (
    <label>{label}
      <select name={name} defaultValue={path || ""}>
        <option value="">بدون ملف</option>
        {path && !assets.some((asset) => asset.path === path) && <option value={path}>الملف المرفق حاليًا</option>}
        {assets.map((asset) => <option key={asset.id} value={asset.path}>{asset.title}</option>)}
      </select>
    </label>
  );
}

export function ContentEditor({ entry, assets, defaultKind, defaultYear, canManage, canDelete }: {
  entry: Content | null;
  assets: Media[];
  defaultKind: Kind;
  defaultYear: string;
  canManage: boolean;
  canDelete: boolean;
}) {
  const [state, submit, pending] = useActionState<{ error?: keyof typeof errors }, FormData>(saveContent, {});
  const [kind, setKind] = useState<Kind>(entry?.kind ?? defaultKind);
  const meta = entry?.metadata ?? {};
  const metaText = (key: string) => typeof meta[key] === "string" ? meta[key] : "";
  const canSchedule = kind === "event" || kind === "calendar" || kind === "survey";
  return (
    <>
      <form action={submit} className="admin-card admin-form" onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(() => submit(form));
      }}>
        <input type="hidden" name="id" value={entry?.id || ""} />
        <input type="hidden" name="updated_at" value={entry?.updated_at || ""} />
        <fieldset>
          <legend>المحتوى</legend>
          <div className="admin-field-grid">
            <label>نوع المحتوى
              <select name="kind" value={kind} onChange={(event) => setKind(event.target.value as Kind)}>
                {Object.entries(kinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <label>العام الدراسي
              <input dir="ltr" name="school_year" required pattern="[0-9]{4}(-|/)[0-9]{4}" maxLength={9}
                defaultValue={entry?.school_year || defaultYear} placeholder="2026-2027" />
            </label>
            <label>العنوان<input name="title" defaultValue={entry?.title || ""} required maxLength={180} /></label>
            <label>اسم الرابط
              <input dir="auto" name="slug" defaultValue={entry?.slug || ""} required maxLength={140}
                placeholder="مثال: أسبوع-القراءة" aria-describedby="admin-slug-help" />
              <small id="admin-slug-help">استخدم حروفًا عربية أو لاتينية صغيرة وأرقامًا وشرطات.</small>
            </label>
            <label className="admin-span">الملخّص
              <textarea name="summary" rows={3} maxLength={600} defaultValue={entry?.summary || ""} />
            </label>
            <label className="admin-span">النص الكامل
              <textarea name="body" rows={8} maxLength={40000} defaultValue={entry?.body || ""} />
            </label>
            {canSchedule && <>
              <label>البداية بتوقيت عُمان
                <input type="datetime-local" name="start_at" dir="ltr" defaultValue={localTime(entry?.start_at)} />
              </label>
              <label>النهاية بتوقيت عُمان
                <input type="datetime-local" name="end_at" dir="ltr" defaultValue={localTime(entry?.end_at)} />
              </label>
            </>}
            {(kind === "event" || kind === "calendar") &&
              <label className="admin-span">المكان<input name="location" maxLength={200} defaultValue={metaText("location")} /></label>}
            {kind === "schedule" &&
              <label className="admin-span">الفئة أو الصف<input name="audience" maxLength={200} defaultValue={metaText("audience")} /></label>}
            {["resource", "parent", "partnership"].includes(kind) &&
              <label className="admin-span">رابط خارجي<input name="external_url" type="url" dir="ltr" defaultValue={metaText("external_url")} /></label>}
            {(kind === "news" || kind === "announcement") &&
              <label className="admin-span">رابط المنشور الأصلي على إكس
                <input name="x_post_url" type="url" dir="ltr" maxLength={1200} defaultValue={metaText("x_post_url")}
                  aria-describedby="admin-x-post-help" />
                <small id="admin-x-post-help">حقل اختياري يربط الخبر أو الإعلان بمنشوره الأصلي.</small>
              </label>}
            {kind === "gallery" &&
              <label className="admin-span">رابط مباشر إلى ملف فيديو
                <input name="video_url" type="url" dir="ltr" defaultValue={metaText("video_url")} placeholder="https://" />
              </label>}
            {kind === "survey" &&
              <label className="admin-span">خيارات الاستبانة
                <textarea name="options" rows={5} defaultValue={Array.isArray(meta.options) ? meta.options.join("\n") : ""}
                  placeholder={"الخيار الأول\nالخيار الثاني"} aria-describedby="admin-options-help" />
                <small id="admin-options-help">أدخل خيارًا واحدًا في كل سطر. يلزم من خيارين إلى 12 خيارًا للنشر.</small>
              </label>}
            {kind === "stat" && <>
              <label>قيمة الإحصائية<input name="value" type="number" min={0} max={100000000} step="any" required
                defaultValue={typeof meta.value === "number" ? meta.value : ""} /></label>
              <label>التسمية<input name="label" maxLength={120} defaultValue={metaText("label")} /></label>
              <label>الأيقونة
                <select name="icon" defaultValue={metaText("icon") || "users"}>
                  <option value="users">المستخدمون</option><option value="graduation-cap">الطلاب</option>
                  <option value="book-open">الكتب</option><option value="trophy">الجوائز</option>
                  <option value="calendar">المواعيد</option><option value="lightbulb">الابتكار</option>
                  <option value="heart-handshake">الشراكات</option><option value="school">المدرسة</option>
                </select>
              </label>
            </>}
          </div>
        </fieldset>
        <fieldset>
          <legend>الصورة والملفات</legend>
          <p>يمكنك رفع المرفقات أولًا من <Link href="/admin?view=media">مكتبة الوسائط</Link>.</p>
          <div className="admin-field-grid">
            <MediaPicker assets={assets.filter((asset) => asset.mime_type.startsWith("image/"))}
              name="image_path" path={entry?.image_path} label="صورة من المكتبة" />
            <MediaPicker assets={assets} name="file_path" path={entry?.file_path} label="ملف مرفق" />
            <label className="admin-span">الوصف البديل للصورة
              <input name="alt" defaultValue={metaText("alt")} maxLength={250} placeholder="صف ما يظهر في الصورة" />
            </label>
            <label className="admin-span">رابط بديل للصورة
              <input dir="ltr" name="image_url" defaultValue={entry?.image_url || ""} maxLength={2000}
                placeholder="https://" aria-describedby="admin-image-help" />
              <small id="admin-image-help">تُعطى الأولوية لصورة مكتبة الوسائط عند اختيارها.</small>
            </label>
          </div>
        </fieldset>
        <fieldset>
          <legend>النشر والعرض</legend>
          <div className="admin-field-grid">
            <label>الحالة
              <select name="status" defaultValue={entry?.status || "draft"}>
                {Object.entries(statuses).filter(([key]) => canManage || key !== "published").map(([key, label]) =>
                  <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <label>ترتيب العرض
              <input name="sort_order" type="number" min={-9999} max={9999} defaultValue={entry?.sort_order || 0} />
            </label>
            <label className="admin-checkbox"><input type="checkbox" name="featured" defaultChecked={entry?.featured} /> محتوى مميّز</label>
            <label className="admin-checkbox"><input type="checkbox" name="is_demo" defaultChecked={entry?.is_demo} /> محتوى تجريبي</label>
          </div>
        </fieldset>
        {state.error && <p className="admin-notice is-error" role="alert">{errors[state.error]}</p>}
        <div className="admin-form-footer">
          <button type="submit" className="admin-button is-primary" disabled={pending}>
            <Save size={17} aria-hidden="true" /> {pending ? "جارٍ حفظ المحتوى…" : "حفظ المحتوى"}
          </button>
          <Link className="admin-button is-secondary" href="/admin">العودة إلى المحتوى</Link>
        </div>
      </form>
      {entry && canDelete && (
        <form action={deleteContent} className="admin-card admin-delete">
          <div><h2>حذف المحتوى</h2><p>يزيل هذا الإجراء السجل من الموقع والأرشيف.</p></div>
          <input type="hidden" name="id" value={entry.id} />
          <input type="hidden" name="updated_at" value={entry.updated_at} />
          <Submit variant="danger" confirmation={"هل تريد حذف «" + entry.title + "»؟"}><Trash2 size={16} aria-hidden="true" /> حذف</Submit>
        </form>
      )}
    </>
  );
}
