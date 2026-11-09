import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { getPublicContents, getPublicSchoolYears } from "@/lib/site";
import { kindLabels, searchableKinds } from "@/components/sections/config";
import { EmptyState, EntryCard, Pager, SectionShell, readPage, readQuery } from "@/components/sections/shared";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "البحث في البوابة",
  description: "ابحثوا في محتوى بوابة نبض النمارق وصفّوا النتائج بحسب نوع المحتوى والعام الدراسي.",
  alternates: { canonical: "/search" },
  robots: { index: false, follow: true },
};

const pageSize = 12;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SearchPage({ searchParams }: Props) {
  const parameters = await searchParams;
  const query = readQuery(parameters.q, 120);
  const year = readQuery(parameters.year, 20);
  const kindValue = readQuery(parameters.kind, 30);
  const kind = searchableKinds.includes(kindValue) ? kindValue : "";
  const page = readPage(parameters.page);
  const [entries, years] = await Promise.all([
    getPublicContents({ kinds: kind ? [kind] : searchableKinds, year: year || undefined, query, limit: pageSize + 1, offset: (page - 1) * pageSize }),
    getPublicSchoolYears(),
  ]);
  const visible = entries.slice(0, pageSize);
  const filtered = Boolean(query || year || kind);

  return (
    <SectionShell title="البحث في البوابة" description="ابحثوا في الأخبار والفعاليات والجداول والموارد المنشورة، وحدّدوا نوع المحتوى أو العام الدراسي." icon={Search}>
      <form action="/search" method="get" role="search" aria-label="البحث في محتوى المدرسة" className="ss-filter ss-panel">
        <label className="ss-field ss-query">
          كلمة البحث
          <input name="q" type="search" defaultValue={query} maxLength={120} placeholder="مثال: القراءة أو جدول الحصص" />
        </label>
        <label className="ss-field">
          نوع المحتوى
          <select name="kind" defaultValue={kind}>
            <option value="">جميع الأنواع</option>
            {searchableKinds.map((option) => <option key={option} value={option}>{kindLabels[option]}</option>)}
          </select>
        </label>
        {(years.length > 0 || year) && (
          <label className="ss-field">
            العام الدراسي
            <select name="year" defaultValue={year}>
              <option value="">جميع الأعوام</option>
              {Array.from(new Set([...years, ...(year ? [year] : [])])).map((option) => <option key={option} value={option} dir="ltr">{option}</option>)}
            </select>
          </label>
        )}
        <button className="ss-button" type="submit"><Search size={17} aria-hidden="true" /> بحث</button>
        {filtered && <Link className="ss-outline" href="/search">مسح البحث</Link>}
      </form>
      <div className="ss-results">
        <h2 className="ss-section-title">{query ? <>نتائج البحث عن «<bdi>{query}</bdi>»</> : filtered ? "نتائج التصفية" : "المحتوى المنشور"}</h2>
      </div>
      {visible.length > 0 ? (
        <div className="ss-grid">{visible.map((entry) => <EntryCard key={entry.id} entry={entry} />)}</div>
      ) : (
        <EmptyState title={filtered ? "لا توجد نتائج مطابقة" : "لا يوجد محتوى منشور"} reset={filtered ? "/search" : undefined}>
          {filtered ? "جرّبوا كلمة أقصر أو وسّعوا نطاق التصفية." : "يظهر المحتوى هنا بعد نشره من المدرسة."}
        </EmptyState>
      )}
      <Pager page={page} hasNext={entries.length > pageSize} path="/search" filters={{ q: query, kind, year }} />
    </SectionShell>
  );
}
