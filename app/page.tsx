import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft, ArrowUpLeft, BookOpen, CalendarDays, Camera, ChevronLeft, ClipboardList, Clock3, GraduationCap,
  HeartHandshake, Image as ImageIcon, Lightbulb, MapPin, Newspaper, Sparkles, Trophy, UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroIntro, HomeCountdown, StatNumber } from "@/components/home-motion";
import { arabicDate, getPublicContents, getPublicSettings, KIND_LABELS, type Content } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  return {
    title: { absolute: `${settings.brand_name} | ${settings.school_name}` },
    alternates: { canonical: "/" },
    openGraph: {
      title: settings.brand_name,
      description: settings.tagline,
      images: settings.heroImageUrl ? [settings.heroImageUrl] : [],
      url: "/",
    },
  };
}

const shortcuts = [
  { name: "التقويم المدرسي", hint: "المواعيد والفعاليات", icon: CalendarDays, href: "/sections/calendar", tone: "teal" },
  { name: "الجداول المدرسية", hint: "الحصص والاختبارات", icon: ClipboardList, href: "/sections/schedule", tone: "blue" },
  { name: "المكتبة التعليمية", hint: "أدلة ومواد للتعلّم", icon: BookOpen, href: "/sections/resource", tone: "gold" },
  { name: "ركن ولي الأمر", hint: "مشاركة وتواصل", icon: HeartHandshake, href: "/sections/parent", tone: "teal" },
];

const statIcons = { users: UsersRound, graduation: GraduationCap, lightbulb: Lightbulb, trophy: Trophy };

function DemoTag() {
  return <span className="demo-tag">تجريبي</span>;
}

function Heading({ kicker, title, href, label }: { kicker: string; title: string; href?: string; label?: string }) {
  return <div className="home-heading">
    <div><p className="eyebrow"><span />{kicker}</p><h2>{title}</h2></div>
    {href && <Link className="section-link" href={href}>{label ?? "عرض الكل"}<ArrowLeft size={17} aria-hidden /></Link>}
  </div>;
}

function ArticleCard({ row }: { row: Content }) {
  return <article className="home-card">
    <Link href={`/details/${row.slug}`} className="home-card-link">
      <div className="home-card-media">
        {row.coverUrl ? <img src={row.coverUrl} alt="" width={480} height={270} loading="lazy" decoding="async" /> : <Newspaper size={39} aria-hidden />}
        <div className="home-card-chips">
          <span className="kind-chip">{KIND_LABELS[row.kind]}</span>
          {row.is_demo && <DemoTag />}
        </div>
      </div>
      <div className="home-card-body">
        {row.published_at && <time dateTime={row.published_at}><CalendarDays size={14} aria-hidden />{arabicDate(row.published_at)}</time>}
        <h3>{row.title}</h3>
        {row.summary && <p>{row.summary}</p>}
        <span className="article-link">اقرأ المزيد <ArrowLeft size={15} aria-hidden /></span>
      </div>
    </Link>
  </article>;
}

export default async function HomePage() {
  const [settings, news, allEvents, initiatives, achievements, stats, gallery] = await Promise.all([
    getPublicSettings(),
    getPublicContents({ kinds: ["news"], limit: 2 }),
    getPublicContents({ kinds: ["event", "calendar"], upcoming: true, limit: 3 }),
    getPublicContents({ kinds: ["initiative"], limit: 3 }),
    getPublicContents({ kinds: ["achievement"], limit: 2 }),
    getPublicContents({ kinds: ["stat"], limit: 8 }),
    getPublicContents({ kinds: ["gallery"], limit: 3 }),
  ]);
  const [nextEvent, ...laterEvents] = allEvents;
  const [firstLine, ...emphasis] = (settings.hero_title || settings.tagline).split("|");
  const statRows = stats.filter((row) => typeof row.metadata.value === "number");

  return <main>
    <section className="hero" aria-labelledby="hero-title">
      {settings.heroImageUrl && <img src={settings.heroImageUrl} width={1536} height={1024} alt="" fetchPriority="high" className="hero-image" />}
      <div className="hero-overlay" />
      <div className="hero-decoration" aria-hidden><span>✦</span><span>✦</span><span>·</span></div>
      <div className="site-container hero-inner">
        <HeroIntro>
          <div className="hero-label"><Sparkles size={16} aria-hidden /> {settings.school_name}</div>
          <h1 id="hero-title">{firstLine}{emphasis.length > 0 && <><br /><em>{emphasis.join(" ")}</em></>}</h1>
          <p>{settings.hero_description}</p>
          <div className="hero-actions">
            <Button asChild><Link href="/sections/about">تعرّف على مدرستنا <ArrowLeft size={18} aria-hidden /></Link></Button>
            <Button variant="outline" asChild><Link href="/sections/news"><Newspaper size={18} aria-hidden /> آخر الأخبار</Link></Button>
          </div>
        </HeroIntro>
        {settings.demo_mode && <div className="hero-image-caption"><Camera size={15} aria-hidden /> صورة توضيحية · نسخة تجريبية</div>}
      </div>
    </section>

    <div className="shortcut-surface">
      <nav className="site-container shortcut-grid" aria-label="وصول سريع">
        {shortcuts.map(({ name, hint, icon: Icon, href, tone }) => (
          <Link key={href} href={href} className="shortcut">
            <span className={`shortcut-icon tone-${tone}`}><Icon size={23} strokeWidth={1.8} aria-hidden /></span>
            <span><strong>{name}</strong><small>{hint}</small></span>
            <ChevronLeft className="shortcut-chevron" size={18} aria-hidden />
          </Link>
        ))}
      </nav>
    </div>

    <section className="news-surface">
      <div className="site-container news-agenda">
        <div className="news-column">
          <Heading kicker="مستجدات المدرسة" title="أخبار النمارق" href="/sections/news" label="جميع الأخبار" />
          {news.length > 0 ? <div className="news-grid">{news.map((row) => <ArticleCard key={row.id} row={row} />)}</div> : <p className="home-empty">ستظهر أخبار المدرسة هنا عند نشرها.</p>}
        </div>
        <aside className="agenda-column" aria-label="الفعاليات القادمة">
          <Heading kicker="أجندة المدرسة" title="فعاليات قادمة" />
          <div className="agenda-card">
            <div className="agenda-feature">
              <div className="agenda-meta"><span><CalendarDays size={15} aria-hidden /> أقرب فعالية</span>{nextEvent?.is_demo && <DemoTag />}</div>
              {nextEvent ? <>
                <h3><Link href={`/details/${nextEvent.slug}`}>{nextEvent.title}</Link></h3>
                <p><Clock3 size={15} aria-hidden /> {arabicDate(nextEvent.start_at!)}</p>
                {typeof nextEvent.metadata.location === "string" && <p><MapPin size={15} aria-hidden /> {nextEvent.metadata.location}</p>}
                <HomeCountdown date={nextEvent.start_at!} />
              </> : <p>ستظهر الفعاليات المجدولة عند نشرها.</p>}
            </div>
            {laterEvents.length > 0 && <ul className="agenda-list">
              {laterEvents.map((row) => <li key={row.id}><Link href={`/details/${row.slug}`}>
                <span className="agenda-date"><b>{arabicDate(row.start_at!, { year: undefined, month: undefined })}</b><small>{arabicDate(row.start_at!, { day: undefined, year: undefined })}</small></span>
                <span><strong>{row.title}</strong>{row.is_demo && <small>تجريبي</small>}</span>
                <ChevronLeft size={15} aria-hidden />
              </Link></li>)}
            </ul>}
            <Link className="agenda-link" href="/sections/calendar">عرض التقويم المدرسي <ArrowLeft size={16} aria-hidden /></Link>
          </div>
        </aside>
      </div>
    </section>

    {initiatives.length > 0 && <section className="home-section">
      <div className="site-container">
        <Heading kicker="التعلّم بالممارسة" title="مبادرات ومشاريع" href="/sections/initiative" />
        <div className="initiative-grid">{initiatives.map((row) => <ArticleCard key={row.id} row={row} />)}</div>
      </div>
    </section>}

    {statRows.length > 0 && <section className="stats-band">
      <div className="site-container">
        <Heading kicker="مجتمع النمارق" title="المدرسة بالأرقام" />
        <div className="stats-grid">
          {statRows.map((row) => {
            const Icon = statIcons[String(row.metadata.icon) as keyof typeof statIcons] || GraduationCap;
            return <div key={row.id} className="stat">
              <Icon size={26} strokeWidth={1.7} aria-hidden />
              <StatNumber value={Number(row.metadata.value)} />
              <span>{typeof row.metadata.label === "string" && row.metadata.label ? row.metadata.label : row.title}</span>
              {row.is_demo && <DemoTag />}
            </div>;
          })}
        </div>
      </div>
    </section>}

    {achievements.length > 0 && <section className="home-section achievements-surface">
      <div className="site-container">
        <Heading kicker="نفخر بجهودهم" title="الإنجازات والتكريم" href="/sections/achievement" />
        <div className="achievement-grid">{achievements.map((row) => <Link key={row.id} href={`/details/${row.slug}`} className="achievement-card">
          {row.coverUrl ? <img src={row.coverUrl} alt="" width={170} height={160} loading="lazy" decoding="async" /> : <span className="achievement-placeholder"><Trophy size={33} aria-hidden /></span>}
          <div>{row.is_demo && <DemoTag />}<h3>{row.title}</h3><p>{row.summary}</p></div>
          <ArrowUpLeft size={18} aria-hidden />
        </Link>)}</div>
      </div>
    </section>}

    {gallery.length > 0 && <section className="home-section gallery-surface">
      <div className="site-container">
        <Heading kicker="من الحياة المدرسية" title="المعرض الإعلامي" href="/sections/gallery" label="استكشف المعرض" />
        <div className="gallery-grid">{gallery.map((row) => <Link key={row.id} href={`/details/${row.slug}`} className="gallery-tile">
          {row.coverUrl ? <img src={row.coverUrl} alt="" width={480} height={290} loading="lazy" decoding="async" /> : <ImageIcon size={35} aria-hidden />}
          <div className="gallery-caption"><span>{row.title} {row.is_demo && <DemoTag />}</span><ArrowUpLeft size={18} aria-hidden /></div>
        </Link>)}</div>
      </div>
    </section>}
  </main>;
}
