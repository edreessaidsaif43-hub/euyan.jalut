import type { Content } from "./site";

const year = "2026/2027";
const epoch = new Date();
function day(offset: number) {
  return new Date(Date.UTC(epoch.getUTCFullYear(), epoch.getUTCMonth(), epoch.getUTCDate() + offset, 5)).toISOString();
}

type DemoRecord = [kind: string, slug: string, title: string, summary: string, image?: string, offset?: number, metadata?: Record<string, unknown>];
const records: DemoRecord[] = [
  ["announcement", "school-portal-launch", "انطلاق بوابة نبض النمارق المدرسية", "تابعوا الأخبار والفعاليات والجداول المدرسية عبر بوابة واحدة، وتعرّفوا إلى قنوات التواصل مع المدرسة."],
  ["news", "school-innovation-week", "أسبوع الابتكار في النمارق", "مساحة للطلبة لتجربة أفكارهم وتحويلها إلى نماذج ومشاريع تعالج تحديات من الحياة اليومية.", "robotics", -3],
  ["news", "science-exhibition", "طلبتنا يقدّمون تجاربهم في معرض العلوم", "تعرّف على نماذج وتجارب صنعها الطلبة خلال حصص العلوم، من الطاقة المتجددة إلى النظام الشمسي.", "learning", -7],
  ["news", "reading-workshop", "لقاء في المكتبة حول القراءة اليومية", "ناقش الطلبة كتبهم المفضلة وشاركوا زملاءهم طرقًا بسيطة لتخصيص وقت يومي للقراءة.", "reading", -13],
  ["event", "reading-together", "ملتقى القراءة والإبداع", "جلسات قراءة وأنشطة قصيرة لتبادل التوصيات بالكتب بين الطلبة.", "reading", 5, { location: "مركز مصادر التعلّم" }],
  ["event", "oman-school-day", "احتفاء المدرسة باليوم الوطني", "برنامج طلابي في الفنون والإلقاء للتعريف بالتراث العُماني.", "art", 9, { location: "الساحة المدرسية" }],
  ["event", "parents-meeting", "لقاء مجلس أولياء الأمور", "لقاء لمناقشة التقدّم الدراسي والاستماع إلى مقترحات أولياء الأمور.", undefined, 15, { location: "قاعة الاجتماعات" }],
  ["calendar", "semester-review", "بداية المراجعة للفصل الدراسي", "موعد توضيحي لبدء أنشطة المراجعة في الصفوف.", undefined, 21],
  ["initiative", "read-and-grow", "مبادرة نقرأ لنرتقي", "يختار الطلبة كتابًا كل أسبوع ويشاركون زملاءهم فكرة أو سؤالًا من قراءتهم.", "reading", -11],
  ["initiative", "little-innovators", "مختبر المبتكر الصغير", "مشروع تعليمي يعرّف الطلبة إلى التصميم والتجريب والعمل التعاوني.", "robotics", -12],
  ["initiative", "school-crafts", "ورشة الحِرف العُمانية", "يوثّق الطلبة الزخارف المحلية ويجرّبون تنفيذ نماذج مستوحاة منها.", "art", -15],
  ["achievement", "innovation-award", "تكريم فريق الابتكار الطلابي", "تكريم تجريبي يسلّط الضوء على التعاون والمثابرة في إعداد المشاريع المدرسية.", "award", -4],
  ["achievement", "reading-recognition", "الاحتفاء بقرّاء الشهر", "مبادرة للاحتفاء بالطلبة المواظبين على القراءة ومشاركة الكتب.", "reading", -16],
  ["gallery", "gallery-learning", "من معرض العلوم", "لقطة توضيحية لطريقة تقديم الطلبة مشاريعهم العلمية.", "learning"],
  ["gallery", "gallery-art", "لحظات من ورشة الفنون", "صورة توضيحية لنشاط فني يستلهم الأنماط الهندسية العُمانية.", "art"],
  ["gallery", "gallery-robotics", "لقطة من مختبر الابتكار", "لقطة توضيحية لطلبة يعملون معًا على روبوت تعليمي.", "robotics"],
  ["about", "our-vision", "رؤيتنا", "بيئة تعليمية جاذبة تعزّز الفضول وتدعم إبداع الطلبة وقدرتهم على التعلّم المستمر."],
  ["about", "our-mission", "رسالتنا", "تمكين الطلبة من المعرفة والمهارات من خلال تعليم فعّال وشراكة متينة مع الأسرة والمجتمع."],
  ["about", "school-goals", "أهدافنا", "دعم التعلّم النشط، وتنمية المسؤولية، وتعزيز الهوية العُمانية والعمل التعاوني."],
  ["about", "school-administration", "الإدارة المدرسية", "يتولّى فريق الإدارة تنسيق البرامج التعليمية ورعاية الطلبة ومتابعة التواصل مع أولياء الأمور."],
  ["schedule", "weekly-class-schedule", "جدول الحصص الأسبوعي", "نموذج استرشادي لأسبوع دراسي. تنشر الإدارة الجداول المعتمدة في هذا القسم."],
  ["schedule", "assessment-schedule", "مواعيد التقويم المستمر", "نموذج تنظيمي لمتابعة المواعيد والمهام الصفية خلال الفصل الدراسي."],
  ["resource", "home-reading-guide", "دليل القراءة في المنزل", "خُذ عشر دقائق للقراءة اليومية. دع طفلك يختار الكتاب، ثم ناقشا سؤالًا واحدًا بعد كل جلسة.", "reading"],
  ["resource", "science-notebook", "دفتر الملاحظات العلمية", "أداة تعليمية لتنظيم التجربة حول السؤال والفرضية والملاحظة والنتيجة.", "learning"],
  ["parent", "parent-learning-guide", "دليل ولي الأمر", "اقتراحات لمتابعة التعلّم وتنظيم وقت الدراسة والتواصل مع المدرسة."],
  ["survey", "family-communication-survey", "استبانة التواصل المدرسي", "ما القناة التي تفضّل استخدامها لمتابعة المستجدات المدرسية؟", undefined, undefined, { options: ["البوابة المدرسية", "البريد الإلكتروني", "لقاءات أولياء الأمور"] }],
  ["partnership", "community-reading", "القراءة تجمعنا", "برنامج توضيحي للتعاون مع مؤسسات المجتمع المحلي لإثراء أنشطة القراءة.", "reading"],
  ["partnership", "green-campus", "بيئة مدرسية مستدامة", "أنشطة توعوية بمشاركة أولياء الأمور حول العناية بمساحات المدرسة وترشيد الموارد.", "art"],
  ["stat", "student-count", "الطلبة", "", undefined, undefined, { value: 420, icon: "users" }],
  ["stat", "teacher-count", "الهيئة التعليمية", "", undefined, undefined, { value: 36, icon: "graduation" }],
  ["stat", "initiatives-count", "مبادرات تعليمية", "", undefined, undefined, { value: 18, icon: "lightbulb" }],
  ["stat", "achievements-count", "إنجازًا مدرسيًا", "", undefined, undefined, { value: 24, icon: "trophy" }],
];

export function getDemoContent(): Content[] {
  return records.map(([kind, slug, title, summary, image, offset, metadata = {}], index) => {
    const date = day(offset ?? -index);
    const coverUrl = image ? `/images/${image}.webp` : null;
    const body = kind === "schedule"
      ? `${summary}\n\nالأحد والثلاثاء: اللغة العربية والرياضيات.\nالاثنين والأربعاء: العلوم واللغة الإنجليزية.\nالخميس: المراجعة والأنشطة.`
      : summary;
    return {
      id: slug, kind, slug, title, summary, body, status: "published", school_year: year,
      image_url: coverUrl, image_path: null, file_path: null, coverUrl, fileUrl: null,
      metadata, start_at: kind === "event" || kind === "calendar" ? date : null, end_at: null,
      featured: ["news", "initiative", "achievement", "gallery"].includes(kind),
      is_demo: true, sort_order: index, author_id: null, created_at: date, updated_at: date,
      published_at: offset && offset < 0 ? date : day(-index),
    };
  });
}
