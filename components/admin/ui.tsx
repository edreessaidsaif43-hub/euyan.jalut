import Link from "next/link";
import {
  ArrowRight, BookOpen, ClipboardList, FileText, History, Image, LayoutDashboard, LogOut, Settings2, ShieldCheck, Users,
} from "lucide-react";
import { logout } from "@/app/admin/actions";
import { errors, roles, type ContentStatus, statuses } from "@/app/admin/model";
import type { StaffRole } from "@/app/admin/access";
import { Submit } from "./submit";

const menu = [
  { id: "content", label: "المحتوى", icon: FileText },
  { id: "media", label: "الوسائط والملفات", icon: Image },
  { id: "inbox", label: "الوارد والاستبانات", icon: ClipboardList },
  { id: "audit", label: "سجل العمليات", icon: History },
  { id: "users", label: "المستخدمون", icon: Users },
  { id: "settings", label: "إعدادات الموقع", icon: Settings2 },
] as const;

export type View = (typeof menu)[number]["id"];

export function AdminShell({ children, role, name, view }: {
  children: React.ReactNode;
  role: StaffRole;
  name: string;
  view: View;
}) {
  const links = menu.filter(({ id }) =>
    id === "content" || id === "media" || role === "admin" || (role === "supervisor" && (id === "audit" || id === "inbox"))
  );
  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <Link href="/admin" className="admin-brand">
          <span className="admin-brand-icon"><BookOpen size={24} aria-hidden="true" /></span>
          <span>نبض النمارق<small>لوحة إدارة المدرسة</small></span>
        </Link>
        <nav aria-label="أقسام لوحة الإدارة">
          {links.map(({ id, label, icon: Icon }) => (
            <Link key={id} href={id === "content" ? "/admin" : "/admin?view=" + id}
              aria-current={view === id ? "page" : undefined}>
              <Icon size={18} aria-hidden="true" />{label}
            </Link>
          ))}
        </nav>
        <div className="admin-nav-footer">
          <Link href="/" className="admin-back"><ArrowRight size={16} aria-hidden="true" /> العودة إلى الموقع</Link>
          <form action={logout}>
            <Submit variant="nav"><LogOut size={16} aria-hidden="true" /> تسجيل الخروج</Submit>
          </form>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <span className="admin-crumb"><LayoutDashboard size={17} aria-hidden="true" /> لوحة الإدارة</span>
          <div className="admin-profile"><ShieldCheck size={18} aria-hidden="true" />
            <Link href="/admin/password" title="تغيير كلمة المرور">{name}<small>{roles[role]}</small></Link>
          </div>
        </header>
        <main className="admin-workspace" id="main-content">{children}</main>
      </div>
    </div>
  );
}

export function Notice({ error, saved }: { error?: string; saved?: string }) {
  if (error && Object.prototype.hasOwnProperty.call(errors, error)) {
    return <p className="admin-notice is-error" role="alert">{errors[error as keyof typeof errors]}</p>;
  }
  if (saved) return <p className="admin-notice" role="status">حُفظت التغييرات بنجاح.</p>;
  return null;
}

export function Status({ value }: { value: ContentStatus }) {
  return <span className={"admin-badge is-" + value}>{statuses[value]}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="admin-empty">{children}</p>;
}

export function AdminHeading({ title, description, children }: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="admin-heading">
      <div><h1>{title}</h1><p>{description}</p></div>
      {children}
    </div>
  );
}

export function Pagination({ page, count, size, query }: {
  page: number;
  count: number;
  size: number;
  query: Record<string, string | undefined>;
}) {
  const last = Math.max(1, Math.ceil(count / size));
  const href = (next: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);
    if (next > 1) params.set("page", String(next));
    return "/admin" + (params.size ? "?" + params.toString() : "");
  };

  if (last === 1 && page === 1) return null;
  return (
    <nav className="admin-pager" aria-label="التنقل بين الصفحات">
      {page > 1 && <Link className="admin-button is-secondary" href={href(page - 1)}>السابق</Link>}
      <span>الصفحة {page.toLocaleString("ar-OM")} من {last.toLocaleString("ar-OM")}</span>
      {page < last && <Link className="admin-button is-secondary" href={href(page + 1)}>التالي</Link>}
    </nav>
  );
}
