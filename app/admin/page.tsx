import Link from "next/link";
import { FilePlus2, Pencil, Search } from "lucide-react";
import { AdminHeading, AdminShell, Empty, Notice, Pagination, Status, type View } from "@/components/admin/ui";
import { AuditPanel, InboxPanel, MediaPanel, SettingsPanel, UsersPanel } from "@/components/admin/panels";
import { requireStaff } from "./access";
import { muscatDate, kinds, ownKey, statuses, type ContentStatus, type Kind } from "./model";

const views = {
  content: "المحتوى",
  media: "الوسائط والملفات",
  inbox: "الوارد والاستبانات",
  audit: "سجل العمليات",
  users: "المستخدمون",
  settings: "إعدادات الموقع",
};
const pageSize = 20;

type Query = Record<string, string | string[] | undefined>;

function stringValue(value: Query[string]) {
  return typeof value === "string" ? value : "";
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<Query> }) {
  const [staff, query] = await Promise.all([requireStaff(), searchParams]);
  const requestedView = stringValue(query.view);
  const view: View = ownKey(views, requestedView) ? requestedView : "content";
  const allowed = view === "content" || view === "media" || staff.isAdmin ||
    (staff.canManage && (view === "inbox" || view === "audit"));
  const page = Math.min(5000, Math.max(1, Number.parseInt(stringValue(query.page), 10) || 1));

  return (
    <AdminShell name={staff.name} role={staff.role} view={view}>
      <Notice error={allowed ? stringValue(query.error) : "permission"} saved={allowed ? stringValue(query.saved) : undefined} />
      {!allowed ? <Link href="/admin" className="admin-button is-secondary">العودة إلى المحتوى</Link> : (
        <>
          {view === "content" && <ContentPanel staff={staff} query={query} page={page} />}
          {view === "media" && <MediaPanel staff={staff} page={page} size={pageSize} />}
          {view === "inbox" && <InboxPanel staff={staff} page={page} size={pageSize} filter={stringValue(query.status)} />}
          {view === "audit" && <AuditPanel staff={staff} page={page} size={pageSize} />}
          {view === "users" && <UsersPanel staff={staff} page={page} size={pageSize} />}
          {view === "settings" && <SettingsPanel staff={staff} />}
        </>
      )}
    </AdminShell>
  );
}

async function ContentPanel({ staff, query, page }: {
  staff: Awaited<ReturnType<typeof requireStaff>>;
  query: Query;
  page: number;
}) {
  const requestedKind = stringValue(query.kind);
  const requestedStatus = stringValue(query.status);
  const rawYear = stringValue(query.year);
  const kind = ownKey(kinds, requestedKind) ? requestedKind : "";
  const status = ownKey(statuses, requestedStatus) ? requestedStatus : "";
  const year = /^\d{4}[-/]\d{4}$/.test(rawYear) ? rawYear : "";
  const search = stringValue(query.q).trim().slice(0, 100);
  const pattern = search.replace(/[\\%_]/g, "\\$&");
  let rows = staff.supabase.from("content")
    .select("id,kind,title,slug,status,school_year,is_demo,updated_at,author_id", { count: "exact" })
    .order("updated_at", { ascending: false }).order("id")
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (!staff.canManage) rows = rows.eq("author_id", staff.user.id);
  if (kind) rows = rows.eq("kind", kind);
  if (status) rows = rows.eq("status", status);
  if (year) rows = rows.eq("school_year", year);
  if (pattern) rows = rows.ilike("title", "%" + pattern + "%");

  const metrics = Object.entries(statuses).map(async ([value, label]) => {
    let count = staff.supabase.from("content").select("id", { count: "exact", head: true }).eq("status", value);
    if (!staff.canManage) count = count.eq("author_id", staff.user.id);
    const result = await count;
    return { value, label, count: result.count };
  });
  const [result, counts] = await Promise.all([rows, Promise.all(metrics)]);
  return (
    <>
      <AdminHeading title={staff.canManage ? "إدارة محتوى الموقع" : "محتواي"} description="أضف المحتوى المدرسي وحرّره وتابع حالته عبر مراحل المراجعة والنشر.">
        <Link className="admin-button is-primary" href={"/admin/content/new" + (kind ? "?kind=" + kind : "")}>
          <FilePlus2 size={18} aria-hidden="true" /> إضافة محتوى
        </Link>
      </AdminHeading>
      <div className="admin-metrics">
        {counts.map((item) => (
          <Link key={item.value} href={"/admin?status=" + item.value} className="admin-metric" aria-label={"تصفية " + item.label}>
            <Status value={item.value as ContentStatus} />
            <strong>{item.count === null ? "—" : item.count.toLocaleString("ar-OM")}</strong>
          </Link>
        ))}
      </div>
      <section className="admin-card" aria-label="قائمة المحتوى">
        <form className="admin-filters" method="get">
          <label>البحث<input name="q" defaultValue={search} placeholder="عنوان المحتوى" maxLength={100} /></label>
          <label>النوع<select name="kind" defaultValue={kind}>
            <option value="">جميع الأنواع</option>
            {Object.entries(kinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select></label>
          <label>الحالة<select name="status" defaultValue={status}>
            <option value="">جميع الحالات</option>
            {Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select></label>
          <label>العام الدراسي<input name="year" defaultValue={year} dir="ltr"
            placeholder="2026-2027" pattern="[0-9]{4}(-|/)[0-9]{4}" maxLength={9} /></label>
          <button type="submit" className="admin-button is-secondary"><Search size={17} aria-hidden="true" /> تصفية</button>
        </form>
        {result.error ? <Notice error="load" /> : result.data.length ? (
          <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="جدول المحتوى المدرسي">
            <table className="admin-table">
              <thead><tr><th>العنوان</th><th>النوع</th><th>العام الدراسي</th><th>الحالة</th><th>آخر تحديث</th><th>الإجراء</th></tr></thead>
              <tbody>
                {result.data.map((item) => (
                  <tr key={item.id}>
                    <th scope="row">{item.title} {item.is_demo && <span className="admin-badge is-demo">تجريبي</span>}</th>
                    <td>{kinds[item.kind as Kind]}</td><td><bdi>{item.school_year}</bdi></td>
                    <td><Status value={item.status as ContentStatus} /></td>
                    <td>{muscatDate.format(new Date(item.updated_at))}</td>
                    <td>
                      {staff.canManage || item.status !== "published" ?
                        <Link className="admin-table-action" href={"/admin/content/" + item.id}><Pencil size={15} aria-hidden="true" /> تحرير</Link> :
                        <Link className="admin-table-action" href={"/details/" + encodeURIComponent(item.slug)}>عرض</Link>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>لا يوجد محتوى مطابق. يمكنك تعديل عوامل التصفية أو إضافة محتوى جديد.</Empty>}
        <Pagination page={page} count={result.count ?? 0} size={pageSize} query={{ q: search, kind, status, year }} />
      </section>
    </>
  );
}
