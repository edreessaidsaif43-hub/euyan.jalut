import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return <main className="site-container route-message">
    <p className="eyebrow"><span />الصفحة غير متاحة</p>
    <h1>لم نجد هذه الصفحة</h1>
    <p>يمكنك العودة إلى الرئيسية أو البحث عن الموضوع الذي تريده.</p>
    <Link className="site-button site-button-primary" href="/">الصفحة الرئيسية <ArrowLeft size={17} aria-hidden /></Link>
    <Link className="site-button site-button-ghost" href="/search">البحث في البوابة</Link>
  </main>;
}
