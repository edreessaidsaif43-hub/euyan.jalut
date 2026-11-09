"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, Menu, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Brand } from "./brand";
import { SECTIONS } from "@/lib/site-config";

const mainKeys = ["about", "news", "initiative", "event", "achievement"];
const mainLabels: Record<string, string> = { news: "الأخبار", initiative: "المبادرات", event: "الفعاليات", achievement: "الإنجازات" };

export function SiteNav({ name, school, announcement }: { name: string; school: string; announcement?: string }) {
  const current = usePathname();
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  useEffect(() => { setOpen(false); setMore(false); }, [current]);
  const additional = SECTIONS.filter(({ key }) => !mainKeys.includes(key));

  return (
    <div className="site-nav">
      <div className="site-container nav-row">
        <Brand name={name} school={school} />
        <nav id="site-navigation" className={`primary-nav ${open ? "nav-open" : ""}`} aria-label="التنقل الرئيسي">
          <Link href="/" aria-current={current === "/" ? "page" : undefined}>الرئيسية</Link>
          {SECTIONS.filter(({ key }) => mainKeys.includes(key)).map(({ key, label, href }) => (
            <Link key={key} href={href} aria-current={current === href ? "page" : undefined}>{mainLabels[key] || label}</Link>
          ))}
          <div className="nav-more" onKeyDown={(event) => {
            if (event.key === "Escape" && more) { setMore(false); event.currentTarget.querySelector("button")?.focus(); }
          }}>
            <button type="button" aria-expanded={more} aria-controls="extra-sections" onClick={() => setMore(!more)}>
              المزيد <ChevronDown size={14} aria-hidden />
            </button>
            <div id="extra-sections" className="nav-popover" hidden={!more}>
              {additional.map(({ key, label, href }) => <Link key={key} href={href} aria-current={current === href ? "page" : undefined}>{label}</Link>)}
            </div>
          </div>
        </nav>
        <div className="nav-tools">
          <Link href="/search" className="nav-tool" aria-label="البحث في الموقع"><Search size={19} aria-hidden /></Link>
          <Link href={announcement ? `/details/${announcement}` : "/sections/news"} className="nav-tool nav-bell" aria-label="الإعلانات المدرسية">
            <Bell size={19} aria-hidden />{announcement && <span className="notification-dot" aria-hidden />}
          </Link>
          <button type="button" className="nav-tool nav-toggle" aria-expanded={open} aria-controls="site-navigation" aria-label={open ? "إغلاق القائمة" : "فتح القائمة"} onClick={() => setOpen(!open)}>
            {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
          </button>
        </div>
      </div>
    </div>
  );
}
