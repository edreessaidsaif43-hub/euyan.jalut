export const SECTIONS = [
  ["about", "عن المدرسة", "تعرّف على هويتنا ورؤيتنا ورسالتنا والإدارة المدرسية."],
  ["news", "الأخبار والإعلانات", "تابع مستجدات المدرسة وإعلاناتها في مكان واحد."],
  ["initiative", "المبادرات والمشاريع", "أفكار طلابية ومشاريع تربوية تتجاوز حدود الصف."],
  ["event", "الفعاليات والأنشطة", "استكشف الأنشطة المدرسية واللقاءات القادمة."],
  ["schedule", "الجداول المدرسية", "اطّلع على جداول الحصص والاختبارات المنشورة."],
  ["achievement", "الإنجازات والتكريم", "نحتفي بجهود طلبتنا ومنسوبي المدرسة."],
  ["resource", "المكتبة التعليمية", "مواد تعليمية وأدلة عملية للطلبة وأولياء الأمور."],
  ["parent", "ركن ولي الأمر", "أدلة واستبانات ومساحة للمقترحات والمشاركة."],
  ["calendar", "التقويم المدرسي", "تصفّح مواعيد المدرسة والفعاليات حسب الشهر."],
  ["gallery", "المعرض الإعلامي", "لحظات من الحياة المدرسية بالصور والفيديو."],
  ["partnership", "الشراكة المجتمعية", "برامج تعاون المدرسة مع الأسرة والمجتمع المحلي."],
  ["contact", "تواصل معنا", "تواصل مع المدرسة عبر القنوات المعتمدة."],
].map(([key, label, description]) => ({ key, label, description, href: `/sections/${key}` }));

export const KIND_LABELS: Record<string, string> = {
  about: "عن المدرسة", news: "أخبار المدرسة", announcement: "إعلان مدرسي",
  initiative: "مبادرة تعليمية", event: "فعالية", schedule: "جدول مدرسي",
  achievement: "إنجاز", resource: "مادة تعليمية", parent: "ولي الأمر",
  survey: "استبانة", calendar: "موعد مدرسي", gallery: "المعرض الإعلامي",
  partnership: "شراكة مجتمعية", stat: "إحصائية", contact: "التواصل",
};

export const PUBLIC_KINDS = Object.keys(KIND_LABELS).filter((kind) => kind !== "stat");

export function siteOrigin() {
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  for (const address of [process.env.NEXT_PUBLIC_SITE_URL, vercelHost && `https://${vercelHost}`]) {
    if (!address) continue;
    try {
      const url = new URL(address);
      if (url.protocol === "https:" || url.protocol === "http:") return url.origin;
    } catch {
      // Try the next configured address.
    }
  }
  return "http://localhost:3000";
}

export function sectionForKind(kind: string) {
  if (kind === "announcement") return "news";
  if (kind === "survey") return "parent";
  return kind;
}

export function arabicDate(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("ar-OM", {
    year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Muscat", ...options,
  }).format(new Date(value));
}
