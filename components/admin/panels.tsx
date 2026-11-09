import Link from "next/link";
import { Download, FileUp, Mail, Save, Trash2, UserRoundPlus } from "lucide-react";
import type { requireStaff } from "@/app/admin/access";
import {
  deleteMedia, inviteUser, saveSettings, updateMedia, updateSubmission, updateUser, uploadMedia,
} from "@/app/admin/actions";
import { mediaUploadMiB, muscatDate, ownKey, roles, settingLabels, type Media } from "@/app/admin/model";
import { normalizeXHandle } from "@/lib/x";
import { AdminHeading, Empty, Notice, Pagination } from "./ui";
import { MediaFileInput, Submit } from "./submit";

type Staff = Awaited<ReturnType<typeof requireStaff>>;
type PanelProps = { staff: Staff; page: number; size: number };

function pageRange(page: number, size: number) {
  return [(page - 1) * size, page * size - 1] as const;
}

export async function MediaPanel({ staff, page, size }: PanelProps) {
  const { data, count, error } = await staff.supabase.from("media").select("*", { count: "exact" })
    .order("created_at", { ascending: false }).order("id").range(...pageRange(page, size));
  const assets = (data ?? []) as (Media & { removal_pending: boolean })[];
  const available = assets.filter((asset) => !asset.removal_pending);
  const signed = available.length
    ? await staff.supabase.storage.from("school-media").createSignedUrls(available.map((asset) => asset.path), 300)
    : { data: null };
  const urls = new Map(signed.data?.map((file) => [file.path, file.signedUrl]) ?? []);
  return (
    <>
      <AdminHeading title="الوسائط والملفات" description="ارفع الصور ومقاطع الفيديو والملفات، ثم أرفقها بالمحتوى المطلوب." />
      <section className="admin-card">
        <h2>رفع ملف</h2>
        <form action={uploadMedia} className="admin-field-grid">
          <label>اسم الملف في المكتبة<input name="title" required maxLength={160} /></label>
          <label>الوصف البديل للصورة<input name="alt_text" maxLength={250} placeholder="صف ما يظهر في الصورة" /></label>
          <MediaFileInput maxMiB={mediaUploadMiB} />
          <div><Submit><FileUp size={17} aria-hidden="true" /> رفع الملف</Submit></div>
        </form>
      </section>
      {error ? <Notice error="load" /> : assets.length ? (
        <div className="admin-list">
          {assets.map((asset) => {
            const url = urls.get(asset.path);
            const canEdit = staff.canManage || asset.uploaded_by === staff.user.id;
            return (
              <article className="admin-card admin-item" key={asset.id}>
                <div className="admin-item-header">
                  <div><h2>{asset.title}</h2><p><bdi>{asset.mime_type}</bdi> · {(asset.size_bytes / 1024).toLocaleString("ar-OM", { maximumFractionDigits: 0 })} كيلوبايت</p></div>
                  {url && <a className="admin-button is-secondary" href={url} target="_blank" rel="noreferrer"><Download size={16} aria-hidden="true" /> فتح الملف</a>}
                </div>
                {asset.removal_pending && <p className="admin-notice" role="status">الحذف قيد التنفيذ. أعد المحاولة لإكماله.</p>}
                {canEdit && !asset.removal_pending && (
                  <form action={updateMedia} className="admin-inline-form">
                    <input type="hidden" name="id" value={asset.id} />
                    <label>اسم الملف<input name="title" defaultValue={asset.title} maxLength={160} required /></label>
                    <label>الوصف البديل<input name="alt_text" defaultValue={asset.alt_text || ""} maxLength={250} /></label>
                    <Submit variant="secondary">حفظ بيانات الملف</Submit>
                  </form>
                )}
                {canEdit && (
                  <form action={deleteMedia}>
                    <input type="hidden" name="id" value={asset.id} />
                    <Submit variant="danger" confirmation={"هل تريد حذف «" + asset.title + "»؟"}>
                      <Trash2 size={15} aria-hidden="true" /> {asset.removal_pending ? "إكمال الحذف" : "حذف الملف"}
                    </Submit>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      ) : <section className="admin-card"><Empty>لم تُرفع ملفات بعد.</Empty></section>}
      <Pagination page={page} count={count ?? 0} size={size} query={{ view: "media" }} />
    </>
  );
}

const inboxStatus = { new: "جديدة", read: "مقروءة", resolved: "مغلقة" } as const;
const inboxKind = { contact: "رسالة تواصل", suggestion: "اقتراح ولي أمر", survey: "رد على استبانة" } as const;

export async function InboxPanel({ staff, page, size, filter }: PanelProps & { filter: string }) {
  if (!staff.canManage) return <Notice error="permission" />;
  const selected = ownKey(inboxStatus, filter) ? filter : "";
  let query = staff.supabase.from("submissions").select("id,kind,payload,status,created_at", { count: "exact" })
    .order("created_at", { ascending: false }).order("id").range(...pageRange(page, size));
  if (selected) query = query.eq("status", selected);
  const { data, count, error } = await query;
  return (
    <>
      <AdminHeading title="الوارد والاستبانات" description="راجع رسائل التواصل ومقترحات أولياء الأمور وإجابات الاستبانات." />
      <section className="admin-card">
        <form method="get" className="admin-inline-form">
          <input type="hidden" name="view" value="inbox" />
          <label>حالة الرسالة
            <select name="status" defaultValue={selected}>
              <option value="">جميع الحالات</option>
              {Object.entries(inboxStatus).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <button className="admin-button is-secondary" type="submit">تصفية الوارد</button>
        </form>
      </section>
      {error ? <Notice error="load" /> : data.length ? (
        <div className="admin-list">
          {data.map((entry) => (
            <article className="admin-card admin-item" key={entry.id}>
              <div className="admin-item-header">
                <div>
                  <h2>{inboxKind[entry.kind as keyof typeof inboxKind]}</h2>
                  <p>{muscatDate.format(new Date(entry.created_at))}</p>
                </div>
                <span className={"admin-badge " + (entry.status === "new" ? "is-review" : "is-draft")}>
                  {inboxStatus[entry.status as keyof typeof inboxStatus]}
                </span>
              </div>
              <dl className="admin-facts">
                {entry.payload.name && <><dt>الاسم</dt><dd>{entry.payload.name}</dd></>}
                {entry.payload.email && <><dt>البريد</dt><dd><a href={"mailto:" + entry.payload.email}><Mail size={15} aria-hidden="true" /> <bdi>{entry.payload.email}</bdi></a></dd></>}
                {entry.payload.survey_title && <><dt>الاستبانة</dt><dd>{entry.payload.survey_title}</dd></>}
                {entry.payload.option && <><dt>الإجابة</dt><dd>{entry.payload.option}</dd></>}
                {entry.payload.message && <><dt>الرسالة</dt><dd className="admin-message">{entry.payload.message}</dd></>}
              </dl>
              <div className="admin-item-actions">
                <form action={updateSubmission} className="admin-inline-form">
                  <input type="hidden" name="id" value={entry.id} />
                  <label>تحديث الحالة<select name="status" defaultValue={entry.status}>
                    {Object.entries(inboxStatus).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select></label>
                  <Submit variant="secondary">حفظ الحالة</Submit>
                </form>
                <form action={updateSubmission}>
                  <input type="hidden" name="id" value={entry.id} />
                  <input type="hidden" name="status" value="delete" />
                  <Submit variant="danger" confirmation="هل تريد حذف هذه الرسالة أو الإجابة؟"><Trash2 size={15} aria-hidden="true" /> حذف</Submit>
                </form>
              </div>
            </article>
          ))}
        </div>
      ) : <section className="admin-card"><Empty>لا توجد رسائل مطابقة.</Empty></section>}
      <Pagination page={page} count={count ?? 0} size={size} query={{ view: "inbox", status: selected }} />
    </>
  );
}

const auditActions: Record<string, string> = { insert: "إضافة", update: "تعديل", delete: "حذف" };
const auditEntities: Record<string, string> = {
  content: "محتوى", media: "وسائط", profiles: "مستخدم", site_settings: "إعداد", submissions: "رسالة",
};

export async function AuditPanel({ staff, page, size }: PanelProps) {
  if (!staff.canManage) return <Notice error="permission" />;
  const { data, count, error } = await staff.supabase.from("audit_log").select("*", { count: "exact" })
    .order("created_at", { ascending: false }).order("id", { ascending: false }).range(...pageRange(page, size));
  const actors = [...new Set((data ?? []).map((entry) => entry.actor_id).filter(Boolean))];
  const profiles = staff.isAdmin && actors.length
    ? await staff.supabase.from("profiles").select("id,display_name").in("id", actors)
    : { data: null };
  const names = new Map(profiles.data?.map((profile) => [profile.id, profile.display_name]) ?? []);

  return (
    <>
      <AdminHeading title="سجل العمليات" description="تتبّع التغييرات المسجّلة على المحتوى والمستخدمين والوسائط والإعدادات." />
      <section className="admin-card">
        {error ? <Notice error="load" /> : data.length ? (
          <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="جدول سجل العمليات">
            <table className="admin-table">
              <thead><tr><th>الوقت</th><th>الإجراء</th><th>السجل</th><th>المستخدم</th></tr></thead>
              <tbody>
                {data.map((entry) => (
                  <tr key={entry.id}>
                    <td>{muscatDate.format(new Date(entry.created_at))}</td>
                    <td>{auditActions[entry.action] ?? entry.action}</td>
                    <td>{auditEntities[entry.entity] ?? entry.entity}
                      <small><bdi>{entry.details?.title || entry.entity_id}</bdi></small>
                    </td>
                    <td><bdi>{names.get(entry.actor_id) || entry.actor_id || "النظام"}</bdi></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>لا توجد عمليات مسجّلة.</Empty>}
        <Pagination page={page} count={count ?? 0} size={size} query={{ view: "audit" }} />
      </section>
    </>
  );
}

export async function UsersPanel({ staff, page, size }: PanelProps) {
  if (!staff.isAdmin) return <Notice error="permission" />;
  const { data, count, error } = await staff.supabase.from("profiles").select("id,display_name,role", { count: "exact" })
    .order("created_at", { ascending: false }).order("id").range(...pageRange(page, size));
  const roleOptions = Object.entries(roles).map(([key, label]) => <option key={key} value={key}>{label}</option>);
  return (
    <>
      <AdminHeading title="المستخدمون والصلاحيات" description="ادعُ أعضاء الفريق وحدّد صلاحياتهم على مستوى النظام والمحتوى." />
      <section className="admin-card">
        <h2>دعوة مستخدم</h2>
        <form action={inviteUser} className="admin-field-grid">
          <label>الاسم<input name="display_name" maxLength={100} required /></label>
          <label>البريد الإلكتروني<input name="email" type="email" dir="ltr" maxLength={254} required /></label>
          <label>الدور<select name="role" defaultValue="editor">{roleOptions.filter((option) => option.key !== "visitor")}</select></label>
          <div className="admin-action-align"><Submit><UserRoundPlus size={17} aria-hidden="true" /> إرسال الدعوة</Submit></div>
        </form>
      </section>
      {error ? <Notice error="load" /> : data.length ? (
        <div className="admin-list">
          {data.map((profile) => (
            <article className="admin-card admin-item" key={profile.id}>
              <div><h2>{profile.display_name || "حساب بلا اسم"}</h2>
                <p><bdi>{profile.id}</bdi>{profile.id === staff.user.id ? " · حسابك الحالي" : ""}</p>
              </div>
              <form action={updateUser} className="admin-inline-form">
                <input type="hidden" name="id" value={profile.id} />
                <label>الاسم<input name="display_name" defaultValue={profile.display_name} maxLength={100} required /></label>
                <label>الدور
                  {profile.id === staff.user.id && <input type="hidden" name="role" value={profile.role} />}
                  <select name="role" defaultValue={profile.role} disabled={profile.id === staff.user.id}>{roleOptions}</select>
                </label>
                <Submit variant="secondary">حفظ الحساب</Submit>
              </form>
            </article>
          ))}
        </div>
      ) : <section className="admin-card"><Empty>لا توجد حسابات.</Empty></section>}
      <Pagination page={page} count={count ?? 0} size={size} query={{ view: "users" }} />
    </>
  );
}

export async function SettingsPanel({ staff }: { staff: Staff }) {
  if (!staff.isAdmin) return <Notice error="permission" />;
  const [settings, images] = await Promise.all([
    staff.supabase.from("site_settings").select("key,value"),
    staff.supabase.from("media").select("id,path,title").eq("removal_pending", false).like("mime_type", "image/%").order("title").limit(1000),
  ]);
  const values = new Map(settings.data?.map(({ key, value }) => [key, value]) ?? []);
  const string = (key: string) => typeof values.get(key) === "string" ? values.get(key) as string : "";
  const heroPath = string("hero_image_path");
  return (
    <>
      <AdminHeading title="إعدادات الموقع" description="عدّل هوية الموقع ومعلومات المدرسة والواجهة الرئيسية وبيانات التواصل." />
      {settings.error || images.error ? <Notice error="load" /> : (
        <form action={saveSettings} className="admin-card admin-form">
          <div className="admin-field-grid">
            {Object.entries(settingLabels).map(([key, label]) => {
              if (key === "demo_mode") return <label className="admin-checkbox admin-span" key={key}>
                <input type="checkbox" name={key} defaultChecked={values.get(key) === true} /> {label}
              </label>;
              if (key === "hero_image_path") return <label key={key}>{label}
                <select name={key} defaultValue={heroPath}>
                  <option value="">بدون صورة من المكتبة</option>
                  {heroPath && !images.data.some((image) => image.path === heroPath) && <option value={heroPath}>الصورة الحالية</option>}
                  {images.data.map((image) => <option key={image.id} value={image.path}>{image.title}</option>)}
                </select>
              </label>;
              if (key === "school_x_handle") return <label key={key}>{label}
                <input name={key} dir="ltr" maxLength={1200} autoCapitalize="none" spellCheck={false}
                  defaultValue={values.has(key) ? string(key) : normalizeXHandle(process.env.SCHOOL_X_HANDLE)}
                  aria-describedby="admin-x-handle-help" />
                <small id="admin-x-handle-help">أدخل المعرّف أو رابط الحساب. لإخفاء الربط، امسح الحقل واحفظ الإعدادات.</small>
              </label>;
              if (key.endsWith("description")) return <label className="admin-span" key={key}>{label}
                <textarea name={key} defaultValue={string(key)} rows={3} maxLength={1200} />
              </label>;
              return <label key={key}>{label}
                <input name={key} defaultValue={string(key)} maxLength={key === "current_school_year" ? 9 : 1200}
                  dir={key.endsWith("_url") || key === "contact_email" || key === "contact_phone" || key === "current_school_year" ? "ltr" : undefined}
                  type={key === "contact_email" ? "email" : "text"}
                  required={["school_name", "brand_name", "current_school_year"].includes(key)}
                  pattern={key === "current_school_year" ? "[0-9]{4}(-|/)[0-9]{4}" : undefined} />
              </label>;
            })}
          </div>
          <div className="admin-form-footer">
            <Submit><Save size={17} aria-hidden="true" /> حفظ الإعدادات</Submit>
            <Link href="/admin/password" className="admin-button is-secondary">تغيير كلمة المرور</Link>
          </div>
        </form>
      )}
    </>
  );
}
