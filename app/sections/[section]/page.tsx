import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock3, ExternalLink, Filter, Mail, MapPin, Phone } from "lucide-react";
import { getPublicContents, getPublicSchoolYears, getPublicSettings, type Content } from "@/lib/site";
import { publicSections, kindLabels, safeHref, type PublicSection } from "@/components/sections/config";
import { SchoolCalendar, EventCountdown, type CalendarEntry } from "@/components/sections/calendar";
import { SchoolForm } from "@/components/sections/school-form";
import { getSchoolFormConfig } from "@/components/sections/form-config";
import { XTimeline } from "@/components/sections/x-timeline";
import {
  BodyCopy, ContentChips, EmptyState, EntryCard, EntryRow, Pager, SectionShell, readPage, readQuery,
} from "@/components/sections/shared";

export const dynamic = "force-dynamic";
const pageSize = 12;

type Props = {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ year?: string | string[]; kind?: string | string[]; page?: string | string[] }>;
};

function getSection(value: string) {
  if (!Object.hasOwn(publicSections, value)) notFound();
  return value as PublicSection;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const key = getSection((await params).section);
  const section = publicSections[key];
  return {
    title: section.title,
    description: section.description,
    alternates: { canonical: `/sections/${key}` },
    openGraph: { title: section.title, description: section.description, url: `/sections/${key}` },
  };
}

function calendarEntries(entries: Content[]): CalendarEntry[] {
  return entries.flatMap((entry) => entry.start_at ? [{
    slug: entry.slug, title: entry.title, kind: entry.kind, start: entry.start_at, end: entry.end_at,
    demo: entry.is_demo, location: typeof entry.metadata.location === "string" ? entry.metadata.location : undefined,
  }] : []);
}

function SectionFilters({ path, kinds, years, kind, year }: {
  path: string; kinds: string[]; years: string[]; kind: string; year: string;
}) {
  if (kinds.length < 2 && years.length === 0 && !year) return null;
  return (
    <form className="ss-filter ss-panel" action={path} method="get">
      {kinds.length > 1 && (
        <label className="ss-field">
          نوع المحتوى
          <select name="kind" defaultValue={kind}>
            <option value="">جميع الأنواع</option>
            {kinds.map((option) => <option key={option} value={option}>{kindLabels[option]}</option>)}
          </select>
        </label>
      )}
      {(years.length > 0 || year) && (
        <label className="ss-field">
          العام الدراسي
          <select name="year" defaultValue={year}>
            <option value="">جميع الأعوام</option>
            {Array.from(new Set([...years, ...(year ? [year] : [])])).map((option) => <option key={option} value={option} dir="ltr">{option}</option>)}
          </select>
        </label>
      )}
      <button className="ss-button" type="submit"><Filter size={16} aria-hidden="true" /> تطبيق التصفية</button>
      {(kind || year) && <Link className="ss-outline" href={path}>مسح التصفية</Link>}
    </form>
  );
}

async function Contact({ entries }: { entries: Content[] }) {
  const settings = await getPublicSettings();
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contact_email) ? settings.contact_email : "";
  const phone = /^\+?[0-9\s()-]{5,24}$/.test(settings.contact_phone) ? settings.contact_phone : "";
  const map = safeHref(settings.map_url);

  return (
    <div className="ss-split">
      <section className="ss-panel">
        <h2 className="ss-section-title">أرسلوا رسالة</h2>
        <SchoolForm kind="contact" token={randomUUID()} available={Boolean(getSchoolFormConfig())} />
      </section>
      <section className="ss-panel">
        <h2 className="ss-section-title">قنوات التواصل</h2>
        <div className="ss-contact-lines">
          {settings.contact_address && <div className="ss-contact-line"><MapPin size={20} aria-hidden="true" />{settings.contact_address}</div>}
          {email && <div className="ss-contact-line"><Mail size={20} aria-hidden="true" /><a dir="ltr" href={`mailto:${encodeURIComponent(email).replace("%40", "@")}`}>{email}</a></div>}
          {phone && <div className="ss-contact-line"><Phone size={20} aria-hidden="true" /><a dir="ltr" href={`tel:${phone.replace(/[^+0-9]/g, "")}`}>{phone}</a></div>}
          {settings.office_hours && <div className="ss-contact-line"><Clock3 size={20} aria-hidden="true" />{settings.office_hours}</div>}
          {map && <a className="ss-text-link" href={map} target="_blank" rel="noreferrer">عرض الموقع على الخريطة <ExternalLink size={15} aria-hidden="true" /></a>}
        </div>
        {entries.map((entry) => (
          <div key={entry.id} style={{ marginBlockStart: "1.1rem" }}>
            <ContentChips entry={entry} />
            <h3 style={{ marginBlock: ".35rem", fontWeight: 800 }}>{entry.title}</h3>
            <BodyCopy value={entry.body || entry.summary} />
          </div>
        ))}
      </section>
    </div>
  );
}

export default async function SectionPage({ params, searchParams }: Props) {
  const key = getSection((await params).section);
  const section = publicSections[key];
  const filters = await searchParams;
  const year = readQuery(filters.year, 20);
  const kindFilter = readQuery(filters.kind, 30);
  const kind = section.kinds.length > 1 && section.kinds.includes(kindFilter) ? kindFilter : "";
  const kinds = kind ? [kind] : section.kinds;
  const page = readPage(filters.page);
  const isFullList = key === "calendar" || key === "contact" || key === "about";
  const path = `/sections/${key}`;
  const [entries, years, settings] = await Promise.all([
    getPublicContents({
      kinds, year: key === "contact" || key === "about" ? undefined : year || undefined,
      limit: isFullList ? 1000 : pageSize + 1, offset: isFullList ? 0 : (page - 1) * pageSize,
    }),
    key === "contact" || key === "about" ? Promise.resolve([]) : getPublicSchoolYears(section.kinds),
    key === "news" ? getPublicSettings() : null,
  ]);
  const visible = isFullList ? entries : entries.slice(0, pageSize);
  const initialTime = new Date().toISOString();
  const upcoming = key === "event" && page === 1
    ? calendarEntries(await getPublicContents({ kinds: ["event"], year: year || undefined, limit: 1, upcoming: true }))[0]
    : undefined;

  return (
    <SectionShell title={section.title} description={section.description} icon={section.icon}>
      {settings?.school_x_handle && <XTimeline account={settings.school_x_handle} />}
      {key !== "contact" && key !== "about" && <SectionFilters path={path} kinds={section.kinds} years={years} kind={kind} year={year} />}
      {key === "contact" ? <Contact entries={visible} /> : key === "calendar" ? (
        <>
          <p className="ss-callout ss-action-row"><CalendarDays size={17} aria-hidden="true" /> تظهر المواعيد بتوقيت سلطنة عُمان.</p>
          <SchoolCalendar items={calendarEntries(visible)} initialTime={initialTime} />
        </>
      ) : (
        <>
          {upcoming && <EventCountdown event={upcoming} initialTime={initialTime} />}
          {visible.length === 0
            ? <EmptyState title={kind || year ? "لا توجد نتائج لهذه التصفية" : "لا يوجد محتوى منشور"} reset={kind || year ? path : undefined}>تظهر هنا المواد عند نشرها من المدرسة.</EmptyState>
            : key === "resource" || key === "schedule"
              ? <div className="ss-rows">{visible.map((entry) => <EntryRow key={entry.id} entry={entry} />)}</div>
              : key === "about"
                ? <div className="ss-grid ss-grid-dense">{visible.map((entry) => (
                    <article className="ss-panel" key={entry.id}>
                      <ContentChips entry={entry} />
                      <h2 className="ss-section-title" style={{ marginBlockStart: ".55rem" }}>{entry.title}</h2>
                      <BodyCopy value={entry.body || entry.summary} />
                    </article>
                  ))}</div>
                : <div className="ss-grid">{visible.map((entry) => <EntryCard key={entry.id} entry={entry} />)}</div>}
          {!isFullList && <Pager page={page} hasNext={entries.length > pageSize} path={path} filters={{ year, kind }} />}
          {key === "parent" && (
            <section className="ss-panel ss-detail" style={{ marginBlockStart: "1.5rem" }}>
              <h2 className="ss-section-title">شاركونا مقترحاتكم</h2>
              <SchoolForm kind="suggestion" token={randomUUID()} available={Boolean(getSchoolFormConfig())} />
            </section>
          )}
        </>
      )}
    </SectionShell>
  );
}
