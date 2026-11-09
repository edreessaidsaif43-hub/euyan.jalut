import Link from "next/link";
import { ArrowUpLeft, BellRing, CalendarDays, ChevronLeft, MapPin } from "lucide-react";
import { Brand } from "./brand";
import { SiteNav } from "./site-nav";
import { getPublicContents, getPublicSettings, SECTIONS } from "@/lib/site";

export async function SiteHeader() {
  const [settings, announcements] = await Promise.all([getPublicSettings(), getPublicContents({ kinds: ["announcement"], limit: 1 })]);
  const announcement = announcements[0];
  return (
    <header className="public-header">
      <div className="top-bar">
        <div className="site-container top-row">
          <span><i className="oman-flag" aria-hidden /><span>سلطنة عُمان</span><span className="top-divider" /><span>بوابة المدرسة</span></span>
          <span><CalendarDays size={14} aria-hidden />{settings.current_school_year ? <>العام الدراسي <bdi>{settings.current_school_year}</bdi></> : settings.school_name}</span>
        </div>
      </div>
      <SiteNav name={settings.brand_name} school={settings.school_name} announcement={announcement?.slug} />
      {announcement && (
        <div className="announce-strip">
          <div className="site-container announce-row">
            <span className="announce-label"><BellRing size={15} aria-hidden /> إعلان مدرسي</span>
            <Link href={`/details/${announcement.slug}`}>{announcement.title}<ChevronLeft size={15} aria-hidden /></Link>
            {announcement.is_demo && <span className="demo-text">محتوى تجريبي</span>}
          </div>
        </div>
      )}
    </header>
  );
}

export async function SiteFooter() {
  const settings = await getPublicSettings();
  return (
    <footer className="site-footer">
      <div className="site-container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Brand name={settings.brand_name} school={settings.school_name} />
            <p>{settings.tagline}</p>
            <span><MapPin size={16} aria-hidden />{settings.contact_address || "سلطنة عُمان"}</span>
          </div>
          <div><h2>استكشف البوابة</h2><ul>{SECTIONS.slice(0, 6).map(({key, href, label}) => <li key={key}><Link href={href}>{label}</Link></li>)}</ul></div>
          <div><h2>روابط تهمّك</h2><ul>{SECTIONS.slice(6).map(({key, href, label}) => <li key={key}><Link href={href}>{label}</Link></li>)}</ul></div>
          <div><h2>التواصل المدرسي</h2><p>نرحّب برسائلكم ومقترحاتكم عبر صفحة التواصل.</p>
            <Link className="footer-contact" href="/sections/contact">تواصل معنا <ArrowUpLeft size={16} aria-hidden /></Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} {settings.school_name}</p>
          {settings.demo_mode && <p>الصور والمواد المميّزة بوسم تجريبي للتوضيح.</p>}
          <Link href="/admin">لوحة الإدارة</Link>
        </div>
      </div>
    </footer>
  );
}
