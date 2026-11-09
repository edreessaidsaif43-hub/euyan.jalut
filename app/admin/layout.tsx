import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = {
  title: "لوحة إدارة نبض النمارق",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="school-admin" dir="rtl" lang="ar">{children}</div>;
}
