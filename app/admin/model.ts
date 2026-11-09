export const kinds = {
  news: "خبر مدرسي",
  announcement: "إعلان",
  about: "عن المدرسة",
  initiative: "مبادرة أو مشروع",
  event: "فعالية أو نشاط",
  schedule: "جدول مدرسي",
  achievement: "إنجاز أو تكريم",
  resource: "مادة تعليمية",
  parent: "ركن ولي الأمر",
  survey: "استبانة",
  calendar: "موعد في التقويم",
  gallery: "عنصر في المعرض",
  partnership: "شراكة مجتمعية",
  stat: "إحصائية",
  contact: "معلومة للتواصل",
} as const;

export type Kind = keyof typeof kinds;
export type ContentStatus = "draft" | "review" | "published";
export const statuses: Record<ContentStatus, string> = {
  draft: "مسودة",
  review: "قيد المراجعة",
  published: "منشور",
};

export const roles = {
  admin: "مدير النظام",
  supervisor: "مشرف المحتوى",
  editor: "محرّر",
  visitor: "زائر",
} as const;

export const settingLabels = {
  school_name: "اسم المدرسة",
  brand_name: "اسم الموقع",
  tagline: "الشعار",
  hero_title: "العنوان الرئيسي",
  hero_description: "النص في الواجهة الرئيسية",
  hero_image_url: "رابط صورة الواجهة الرئيسية",
  hero_image_path: "صورة الواجهة من مكتبة الوسائط",
  about_description: "وصف المدرسة",
  current_school_year: "العام الدراسي الحالي",
  contact_email: "البريد الإلكتروني",
  contact_phone: "الهاتف",
  school_x_handle: "حساب المدرسة على إكس",
  contact_address: "العنوان",
  office_hours: "ساعات العمل",
  map_url: "رابط الخريطة",
  demo_mode: "تمييز الموقع كتجريبي",
} as const;

export type Content = {
  id: string;
  kind: Kind;
  title: string;
  slug: string;
  summary: string | null;
  body: string | null;
  status: ContentStatus;
  school_year: string | null;
  image_url: string | null;
  image_path: string | null;
  file_path: string | null;
  metadata: Record<string, unknown> | null;
  start_at: string | null;
  end_at: string | null;
  featured: boolean;
  is_demo: boolean;
  sort_order: number;
  author_id: string | null;
  updated_at: string;
};

export type Media = {
  id: string;
  bucket: string;
  path: string;
  title: string;
  alt_text: string | null;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string | null;
  created_at: string;
};

export function ownKey<T extends object>(record: T, key: string): key is keyof T & string {
  return Object.prototype.hasOwnProperty.call(record, key);
}

export const muscatDate = new Intl.DateTimeFormat("ar-OM", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Muscat",
});

export const mediaUploadMiB = process.env.VERCEL === "1" ? 4 : 12;

export const errors = {
  missing: "تحقق من الحقول المطلوبة ثم أعد المحاولة.",
  xHandle: "أدخل معرّف حساب المدرسة على إكس أو رابط صفحته الشخصية.",
  xPost: "أدخل رابطًا مباشرًا إلى المنشور الأصلي على إكس.",
  permission: "لا تسمح صلاحيات حسابك بتنفيذ هذه العملية.",
  conflict: "توجد قيمة مكررة أو تغيّر هذا السجل أثناء تحريره. حدّث الصفحة وأعد المحاولة.",
  media: "تعذّر تنفيذ عملية الملف. تحقق من نوعه وحجمه أو من استخدامه في المحتوى.",
  email: "تعذّر إرسال الدعوة. تحقق من إعدادات البريد ومن وجود الحساب.",
  service: "لم يُضبط مفتاح الخدمة الخاص بإدارة حسابات المستخدمين.",
  save: "تعذّر حفظ التغييرات. تحقق من صحة القيم واتصال قاعدة البيانات.",
  load: "تعذّر جلب البيانات. تحقق من إعدادات قاعدة البيانات والصلاحيات.",
  login: "تعذّر تسجيل الدخول. تحقق من بيانات الحساب وصلاحياته.",
  auth: "رابط المصادقة غير صالح أو انتهت مدته. اطلب رابطًا جديدًا من مدير النظام.",
  password: "أدخل كلمة مرور من 12 حرفًا على الأقل وتأكد من تطابق الحقلين.",
  session: "انتهت جلسة المصادقة. سجّل دخولك مجددًا.",
} as const;
