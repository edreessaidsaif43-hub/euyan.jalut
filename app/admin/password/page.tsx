import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Notice } from "@/components/admin/ui";
import { Submit } from "@/components/admin/submit";
import { requireStaff } from "../access";
import { changePassword } from "../actions";

export default async function PasswordPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [query] = await Promise.all([searchParams, requireStaff()]);
  return (
    <main className="admin-auth" id="main-content">
      <div className="admin-auth-card">
        <Link href="/admin" className="admin-auth-return">العودة إلى لوحة الإدارة</Link>
        <div className="admin-auth-icon"><LockKeyhole size={26} aria-hidden="true" /></div>
        <p className="admin-eyebrow">نبض النمارق</p>
        <h1>تعيين كلمة المرور</h1>
        <p>اختر كلمة مرور قوية تتكون من 12 حرفًا على الأقل.</p>
        <Notice error={query.error} />
        <form action={changePassword} className="admin-auth-form">
          <label>كلمة المرور الجديدة<input name="password" type="password" required autoComplete="new-password" dir="ltr" minLength={12} maxLength={128} /></label>
          <label>تأكيد كلمة المرور<input name="confirm" type="password" required autoComplete="new-password" dir="ltr" minLength={12} maxLength={128} /></label>
          <Submit>حفظ كلمة المرور</Submit>
        </form>
      </div>
    </main>
  );
}
