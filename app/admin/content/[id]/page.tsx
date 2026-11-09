import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink } from "lucide-react";
import { ContentEditor } from "@/components/admin/content-editor";
import { AdminHeading, AdminShell, Notice, Status } from "@/components/admin/ui";
import { requireStaff } from "../../access";
import { kinds, ownKey, type Content, type Media } from "../../model";

export default async function ContentPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string; saved?: string; error?: string }>;
}) {
  const [{ id }, query, staff] = await Promise.all([params, searchParams, requireStaff()]);
  if (id !== "new" && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const [record, media, year] = await Promise.all([
    id === "new" ? Promise.resolve({ data: null, error: null }) :
      staff.supabase.from("content").select("*").eq("id", id).maybeSingle(),
    staff.supabase.from("media").select("*").eq("removal_pending", false).order("title").limit(1000),
    staff.supabase.from("site_settings").select("value").eq("key", "current_school_year").maybeSingle(),
  ]);
  const entry = record.data as Content | null;
  if (!record.error && id !== "new" &&
    (!entry || (!staff.canManage && (entry.author_id !== staff.user.id || entry.status === "published")))) notFound();
  const defaultKind = query.kind && ownKey(kinds, query.kind) ? query.kind : "news";
  const defaultYear = typeof year.data?.value === "string" ? year.data.value : "";
  return (
    <AdminShell name={staff.name} role={staff.role} view="content">
      <Link href="/admin" className="admin-back"><ArrowRight size={17} aria-hidden="true" /> كل المحتوى</Link>
      <AdminHeading title={entry?.title || "إضافة محتوى جديد"} description={entry ? "حرّر تفاصيل المحتوى وحدّد حالة النشر." : "اختر نوع المحتوى وابدأ بكتابة المسودة."}>
        {entry && <div className="admin-form-footer">
          <Status value={entry.status} />
          {entry.status === "published" && <Link className="admin-button is-secondary" href={"/details/" + encodeURIComponent(entry.slug)}>
            <ExternalLink size={16} aria-hidden="true" /> عرض في الموقع
          </Link>}
        </div>}
      </AdminHeading>
      <Notice error={record.error || media.error || year.error ? "load" : query.error} saved={query.saved} />
      {!record.error && <ContentEditor key={entry?.updated_at || "new"} entry={entry} assets={(media.data ?? []) as Media[]}
        defaultKind={defaultKind} defaultYear={defaultYear} canManage={staff.canManage}
        canDelete={staff.canManage || entry?.status === "draft"} />}
    </AdminShell>
  );
}
