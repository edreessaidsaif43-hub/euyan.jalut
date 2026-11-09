import Link from "next/link";
import { ArrowDownToLine, ArrowLeft, ArrowRight, CalendarDays, ChevronLeft, FolderOpen, MapPin } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { Content } from "@/lib/site";
import { formatOmanDate, kindIcons, kindLabels, safeHref } from "./config";
import "./sections.css";

export function SectionShell({
  title, description, kicker, icon: Icon, parent, children,
}: {
  title: string;
  description?: string | null;
  kicker?: string;
  icon: LucideIcon;
  parent?: { title: string; href: string };
  children: ReactNode;
}) {
  return (
    <main className="ss-page" dir="rtl">
      <header className="ss-hero">
        <div className="ss-wrap ss-hero-inner">
          <nav className="ss-breadcrumb" aria-label="مسار الصفحة">
            <Link href="/">الرئيسية</Link>
            <ChevronLeft size={15} aria-hidden="true" />
            {parent && <><Link href={parent.href}>{parent.title}</Link><ChevronLeft size={15} aria-hidden="true" /></>}
            <span aria-current="page">{title}</span>
          </nav>
          <span className="ss-kicker"><Icon size={18} aria-hidden="true" />{kicker ?? "نبض النمارق"}</span>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
      </header>
      <div className="ss-wrap ss-content">{children}</div>
    </main>
  );
}

export function ContentChips({ entry }: { entry: Content }) {
  return (
    <div className="ss-chips">
      <span className="ss-chip">{kindLabels[entry.kind] ?? "محتوى مدرسي"}</span>
      {entry.school_year && <span className="ss-chip ss-chip-neutral"><bdi>{entry.school_year}</bdi></span>}
      {entry.is_demo && <span className="ss-chip ss-chip-demo">محتوى تجريبي</span>}
    </div>
  );
}

export function EntryMeta({ entry, isDetail = false }: { entry: Content; isDetail?: boolean }) {
  const timestamp = entry.start_at || entry.published_at;
  const date = formatOmanDate(timestamp);
  const location = typeof entry.metadata.location === "string" && entry.metadata.location;
  if (!date && !location) return null;
  return (
    <div className="ss-meta">
      {date && <time dateTime={timestamp!}><CalendarDays size={15} aria-hidden="true" />{date}</time>}
      {location && <span><MapPin size={15} aria-hidden="true" />{location}</span>}
      {isDetail && entry.start_at && entry.end_at && formatOmanDate(entry.start_at) !== formatOmanDate(entry.end_at) &&
        <time dateTime={entry.end_at}>حتى {formatOmanDate(entry.end_at)}</time>}
    </div>
  );
}

export function EmptyState({ title = "لا يوجد محتوى منشور", children, reset }: {
  title?: string;
  children?: ReactNode;
  reset?: string;
}) {
  return (
    <div className="ss-panel ss-empty">
      <FolderOpen size={31} aria-hidden="true" />
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {reset && <Link className="ss-outline" href={reset}>عرض كل المحتوى</Link>}
    </div>
  );
}

export function EntryCard({ entry }: { entry: Content }) {
  const Icon = kindIcons[entry.kind] ?? FolderOpen;
  const href = detailHref(entry.slug);
  const coverUrl = safeHref(entry.coverUrl, true);
  return (
    <article className="ss-card">
      {coverUrl
        ? <Link href={href} className="ss-card-cover" aria-label={entry.title}>
            {/* Signed Storage URLs are rendered directly so they work with any Supabase project. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverUrl} alt="" loading="lazy" decoding="async" />
          </Link>
        : <div className="ss-card-mark" aria-hidden="true"><Icon size={21} /></div>}
      <div className="ss-card-content">
        <ContentChips entry={entry} />
        <h2><Link href={href}>{entry.title}</Link></h2>
        {entry.summary && <p>{entry.summary}</p>}
        <EntryMeta entry={entry} />
        <div className="ss-card-footer">
          <Link className="ss-text-link" href={href} aria-label={`اقرأ المزيد عن ${entry.title}`}>
            {entry.kind === "survey" ? "شارك في الاستبانة" : "عرض التفاصيل"}
            <ArrowLeft size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function EntryRow({ entry }: { entry: Content }) {
  const Icon = kindIcons[entry.kind] ?? FolderOpen;
  const fileUrl = safeHref(entry.fileUrl, true);
  return (
    <article className="ss-row">
      <div className="ss-card-mark" aria-hidden="true"><Icon size={21} /></div>
      <div className="ss-row-main">
        <ContentChips entry={entry} />
        <h2><Link href={detailHref(entry.slug)}>{entry.title}</Link></h2>
        {entry.summary && <p>{entry.summary}</p>}
        {typeof entry.metadata.audience === "string" && <p>{entry.metadata.audience}</p>}
      </div>
      <div className="ss-action-row">
        {fileUrl && <a href={downloadHref(fileUrl)} className="ss-outline" download><ArrowDownToLine size={16} aria-hidden="true" /> تنزيل الملف</a>}
        <Link className="ss-text-link" href={detailHref(entry.slug)} aria-label={`تفاصيل ${entry.title}`}>
          التفاصيل <ArrowLeft size={15} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export function BodyCopy({ value }: { value?: string | null }) {
  if (!value) return null;
  return (
    <div className="ss-body">
      {value.trim().split(/\r?\n\s*\r?\n/).map((block, index) => {
        const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        if (lines.length === 0) return null;
        if (lines.every((line) => /^[-*]\s+/.test(line))) {
          return <ul key={index}>{lines.map((line, lineIndex) => <li key={lineIndex}>{line.slice(2)}</li>)}</ul>;
        }
        if (/^#{1,3}\s/.test(lines[0])) {
          return <div key={index}><h2>{lines[0].replace(/^#{1,3}\s+/, "")}</h2>{lines.slice(1).map((line, lineIndex) => <p key={lineIndex}>{line}</p>)}</div>;
        }
        return <p key={index}>{lines.map((line, lineIndex) => <span key={lineIndex}>{lineIndex > 0 && <br />}{line}</span>)}</p>;
      })}
    </div>
  );
}

export function Pager({ page, hasNext, path, filters }: {
  page: number;
  hasNext: boolean;
  path: string;
  filters: Record<string, string>;
}) {
  if (page === 1 && !hasNext) return null;
  const linkForPage = (number: number) => {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    if (number > 1) query.set("page", String(number));
    return query.size ? `${path}?${query}` : path;
  };
  return (
    <nav aria-label="صفحات النتائج" className="ss-pager">
      {page > 1 && <Link className="ss-outline" href={linkForPage(page - 1)}><ArrowRight size={15} aria-hidden="true" /> السابق</Link>}
      <span>الصفحة {new Intl.NumberFormat("ar-OM").format(page)}</span>
      {hasNext && <Link className="ss-outline" href={linkForPage(page + 1)}>التالي <ArrowLeft size={15} aria-hidden="true" /></Link>}
    </nav>
  );
}

export const detailHref = (slug: string) => `/details/${encodeURIComponent(slug)}`;

export const downloadHref = (url: string) => url.startsWith("/media?") ? `${url}&download=1` : url;

export function readQuery(value?: string | string[], maxLength = 100) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function readPage(value?: string | string[]) {
  const page = Number(readQuery(value, 4));
  return Number.isInteger(page) && page >= 1 && page <= 500 ? page : 1;
}
