import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownToLine, ArrowRight, CalendarDays, Clock3, ExternalLink, FolderOpen, MessageCircle } from "lucide-react";
import { getPublicClient, getPublicContentBySlug, getPublicContents, siteOrigin } from "@/lib/site";
import { normalizeXPostUrl } from "@/lib/x";
import { formatOmanDate, formatOmanTime, isVideoPath, kindIcons, kindLabels, publicSections, safeHref, sectionForKind } from "@/components/sections/config";
import { getSchoolFormConfig } from "@/components/sections/form-config";
import { SchoolForm } from "@/components/sections/school-form";
import { BodyCopy, ContentChips, EntryCard, EntryMeta, SectionShell, detailHref, downloadHref } from "@/components/sections/shared";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function detail(slug: string) {
  const entry = await getPublicContentBySlug(slug);
  if (!entry) notFound();
  return entry;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const entry = await detail((await params).slug);
  const href = detailHref(entry.slug);
  const coverUrl = safeHref(entry.coverUrl, true);
  return {
    title: entry.title,
    description: entry.summary ?? undefined,
    alternates: { canonical: href },
    openGraph: {
      title: entry.title,
      description: entry.summary ?? undefined,
      url: href,
      type: entry.kind === "news" || entry.kind === "announcement" ? "article" : "website",
      images: coverUrl ? [{ url: coverUrl, alt: entry.title }] : undefined,
    },
    ...(entry.is_demo ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function DetailPage({ params }: Props) {
  const entry = await detail((await params).slug);
  const Icon = kindIcons[entry.kind] ?? FolderOpen;
  const sectionKey = sectionForKind(entry.kind);
  const section = publicSections[sectionKey];
  const sectionHref = `/sections/${sectionKey}`;
  const coverUrl = safeHref(entry.coverUrl, true);
  const fileUrl = safeHref(entry.fileUrl, true);
  const videoUrl = safeHref(entry.metadata.video_url) || (fileUrl && isVideoPath(entry.file_path) ? fileUrl : "");
  const captionsUrl = safeHref(entry.metadata.captions_url, true);
  const externalUrl = safeHref(entry.metadata.external_url);
  const alt = typeof entry.metadata.alt === "string" ? entry.metadata.alt : entry.title;
  const options = Array.isArray(entry.metadata.options)
    ? [...new Set(entry.metadata.options.filter((option): option is string => typeof option === "string").map((option) => option.trim()).filter((option) => option && option.length <= 160))].slice(0, 12)
    : [];
  const isNews = entry.kind === "news" || entry.kind === "announcement";
  const xPost = isNews ? normalizeXPostUrl(entry.metadata.x_post_url) : "";
  const isEvent = entry.kind === "event" || entry.kind === "calendar";
  const surveyUpcoming = entry.kind === "survey" && entry.start_at && Date.parse(entry.start_at) > Date.now();
  const surveyClosed = entry.kind === "survey" && entry.end_at && Date.parse(entry.end_at) < Date.now();
  const whatsapp = isNews
    ? `https://wa.me/?text=${encodeURIComponent(`${entry.title}\n${new URL(detailHref(entry.slug), siteOrigin()).href}`)}`
    : "";
  const related = (await getPublicContents({ kinds: [entry.kind], limit: 4 })).filter((item) => item.id !== entry.id).slice(0, 3);

  return (
    <SectionShell
      title={entry.title}
      description={entry.summary}
      icon={Icon}
      kicker={kindLabels[entry.kind] ?? "نبض النمارق"}
      parent={{ title: section.title, href: sectionHref }}
    >
      {entry.is_demo && <p className="ss-callout ss-detail">هذا المحتوى تجريبي لأغراض عرض البوابة.</p>}
      <article className="ss-panel ss-detail">
        <ContentChips entry={entry} />
        <EntryMeta entry={entry} isDetail />
        {isEvent && entry.start_at && (
          <div className="ss-meta">
            <time dateTime={entry.start_at}><Clock3 size={15} aria-hidden="true" />يبدأ {formatOmanTime(entry.start_at)}</time>
            {entry.end_at && <time dateTime={entry.end_at}><CalendarDays size={15} aria-hidden="true" />ينتهي {formatOmanDate(entry.end_at)} · {formatOmanTime(entry.end_at)}</time>}
          </div>
        )}
        {videoUrl ? (
          <video controls playsInline preload="metadata" poster={coverUrl || undefined} src={videoUrl} aria-label={entry.title}>
            {captionsUrl && <track kind="captions" srcLang="ar" label="العربية" src={captionsUrl} />}
            متصفّحكم لا يدعم تشغيل الفيديو. <a href={videoUrl}>افتحوا ملف الفيديو</a>.
          </video>
        ) : coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="ss-detail-cover" src={coverUrl} alt={alt} decoding="async" fetchPriority="high" />
        ) : null}
        <BodyCopy value={entry.body && entry.body !== entry.summary ? entry.body : null} />
        {(fileUrl || externalUrl || xPost || whatsapp) && (
          <div className="ss-action-row">
            {fileUrl && <a className="ss-outline" href={downloadHref(fileUrl)} download><ArrowDownToLine size={17} aria-hidden="true" /> تنزيل الملف</a>}
            {externalUrl && <a className="ss-outline" href={externalUrl} target="_blank" rel="noreferrer"><ExternalLink size={17} aria-hidden="true" /> فتح الرابط</a>}
            {xPost && <a className="ss-outline" href={xPost} target="_blank" rel="noreferrer"><ExternalLink size={17} aria-hidden="true" /> عرض المنشور على إكس</a>}
            {whatsapp && <a className="ss-button" href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={17} aria-hidden="true" /> مشاركة عبر واتساب</a>}
          </div>
        )}
        {entry.kind === "survey" && (
          <section>
            <h2 className="ss-section-title">المشاركة في الاستبانة</h2>
            {surveyUpcoming ? <p className="ss-muted">يفتح باب المشاركة في {formatOmanDate(entry.start_at)}.</p>
              : surveyClosed ? <p className="ss-muted">انتهت فترة المشاركة في هذه الاستبانة.</p>
                : <SchoolForm kind="survey" surveyId={entry.id} options={options} token={randomUUID()}
                    available={Boolean(getSchoolFormConfig() && getPublicClient() && options.length >= 2)} />}
          </section>
        )}
        <Link className="ss-text-link" href={sectionHref}><ArrowRight size={16} aria-hidden="true" /> العودة إلى {section.title}</Link>
      </article>
      {related.length > 0 && (
        <section style={{ marginBlockStart: "2rem" }} aria-labelledby="related-title">
          <h2 id="related-title" className="ss-section-title">من القسم نفسه</h2>
          <div className="ss-grid">{related.map((item) => <EntryCard key={item.id} entry={item} />)}</div>
        </section>
      )}
    </SectionShell>
  );
}
