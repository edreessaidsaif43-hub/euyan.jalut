import Link from "next/link";
import { ArrowRight, BookOpen, LockKeyhole, Mail } from "lucide-react";
import { redirect } from "next/navigation";
import { Notice } from "@/components/admin/ui";
import { Submit } from "@/components/admin/submit";
import { getPublicConfig } from "@/lib/supabase/config";
import { getStaff } from "../access";
import { login, resetPassword } from "../actions";

type Props = { searchParams: Promise<{ error?: string; reset?: string; sent?: string }> };

export default async function AdminLogin({ searchParams }: Props) {
  const [query, staff] = await Promise.all([searchParams, getStaff()]);
  if (staff) redirect("/admin");
  const configured = Boolean(getPublicConfig());
  const reset = query.reset === "1";
  return (
    <main className="admin-auth" id="main-content">
      <div className="admin-auth-card">
        <Link href="/" className="admin-auth-return"><ArrowRight size={16} aria-hidden="true" /> العودة إلى الموقع</Link>
        <div className="admin-auth-icon"><BookOpen size={26} aria-hidden="true" /></div>
        <p className="admin-eyebrow">نبض النمارق</p>
        <h1>{reset ? "استعادة كلمة المرور" : "دخول لوحة الإدارة"}</h1>
        <p>{reset ? "أدخل البريد المرتبط بحسابك لاستلام رابط الاستعادة." : "بوابة إدارة المحتوى لفريق مدرسة النمارق للتعليم الأساسي."}</p>
        <Notice error={query.error} />
        {query.sent === "1" && <p className="admin-notice" role="status">إذا كان البريد مرتبطًا بحساب، فستتلقى رابط الاستعادة.</p>}
        {!configured ? (
          <p className="admin-notice is-error" role="status">لوحة الإدارة متاحة بعد ربط المشروع بقاعدة Supabase. اتبع دليل الإعداد ثم أعد تشغيل الموقع.</p>
        ) : (
          <form action={reset ? resetPassword : login} className="admin-auth-form">
            <label><span><Mail size={16} aria-hidden="true" /> البريد الإلكتروني</span>
              <input name="email" type="email" required autoComplete="username" dir="ltr" maxLength={254} />
            </label>
            {!reset && <label><span><LockKeyhole size={16} aria-hidden="true" /> كلمة المرور</span>
              <input name="password" type="password" required autoComplete="current-password" dir="ltr" maxLength={256} />
            </label>}
            <Submit>{reset ? "إرسال رابط الاستعادة" : "تسجيل الدخول"}</Submit>
          </form>
        )}
        <Link href={reset ? "/admin/login" : "/admin/login?reset=1"} className="admin-auth-help">
          {reset ? "العودة إلى تسجيل الدخول" : "استعادة كلمة المرور"}
        </Link>
      </div>
    </main>
  );
}
