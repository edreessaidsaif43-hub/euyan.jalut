# نبض النمارق

بوابة عربية باتجاه RTL لمدرسة النمارق للتعليم الأساسي في سلطنة عُمان، تحت شعار «مدرستنا تنبض بالعلم والإبداع».

يحتوي المشروع على الواجهة العامة وأقسامها الثلاثة عشر، والبحث والأرشفة، والتقويم، وإدارة المحتوى والنشر والملفات والمستخدمين من `/admin`. يعتمد على Next.js App Router وReact وTypeScript وTailwind CSS ومكوّن زر من نمط shadcn/ui، مع Lucide وFramer Motion وخط Cairo مضمّن محليًا. تُدار البيانات والمصادقة والملفات في Supabase.

## المعاينة المحلية

ثبّت Node.js 22 أو أحدث، ثم نفّذ من مجلد المشروع.

```sh
npm ci
npm run dev
```

افتح `http://localhost:3000`. إذا لم تضع متغيرات Supabase، يعرض خادم التطوير محتوى توضيحيًا موسومًا. تتطلب لوحة الإدارة وإرسال النماذج اتصالًا بقاعدة البيانات. تحتوي `public/images` على صور تعليمية مولّدة بأداة ImageGen توضح مدرسة متخيّلة في بيئة عُمانية. تشمل المشاهد الفناء المدرسي والروبوتات ومعرض العلوم والمكتبة والتكريم والفنون.

## تهيئة Supabase

1. أنشئ مشروع Supabase، ثم طبّق `supabase/migrations/202611090001_school.sql` من SQL Editor. عند استخدام CLI، طبّق الترحيلات بالأوامر أدناه. تضبط الترحيلات RLS والمشغّلات وسجل العمليات ودالة استقبال النماذج وحاوية `school-media` الخاصة. [ترحيلات Supabase](https://supabase.com/docs/guides/deployment/database-migrations)

   ```sh
   supabase login
   supabase link
   supabase db push --remote
   ```

2. لبيئة الاختبار، يمكنك تشغيل `supabase/seed.sql` في SQL Editor أو تطبيقه بـ `supabase db push --include-seed --remote`. يمكن كذلك تشغيل بيئة Supabase المحلية بـ `supabase start` مع Docker. يستخدم وضع العرض بيانات توضيحية موسومة، وتبدأ قاعدة الإنتاج بترحيلات المخطط وحدها.
3. أنشئ المستخدم الأول من **Authentication → Users**. في SQL Editor عدّل البريد في الاستعلام التالي ثم نفّذه بحساب مالك قاعدة البيانات.

   ```sql
   update public.profiles p
   set role = 'admin'
   from auth.users u
   where p.id = u.id and lower(u.email) = lower('YOUR-ADMIN-EMAIL');
   ```

4. في إعدادات Auth، عيّن **Site URL** إلى عنوان النشر النهائي، وأضف المسار `https://YOUR-DOMAIN/auth/confirm` إلى عناوين إعادة التوجيه المسموح بها. اضبط قالبَي **Invite user** و**Reset password** بمحتوى `supabase/templates/`. أوقف التسجيل العام، واضبط SMTP للدعوات والاستعادة في الإنتاج. [قوالب بريد Supabase](https://supabase.com/docs/guides/auth/auth-email-templates)
5. انسخ `.env.example` إلى `.env.local` واملأ القيم. عد تشغيل Next.js بعد تعديل الملف.

| المتغير | القيمة |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | عنوان البوابة الكامل، ويستخدم في الروابط الأساسية والمشاركة. |
| `NEXT_PUBLIC_SUPABASE_URL` | عنوان مشروع Supabase. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | المفتاح العام. يمكن استخدام `NEXT_PUBLIC_SUPABASE_ANON_KEY` للمفتاح العام القديم. |
| `SUPABASE_SERVICE_ROLE_KEY` | مفتاح الخادم الخاص لدعوات المستخدمين واستقبال النماذج. خزّنه في أسرار بيئة التشغيل. |
| `FORM_RATE_LIMIT_SECRET` | قيمة عشوائية سرية بطول 32 حرفًا على الأقل. |
| `FORM_CLIENT_IP_HEADER` | اختياري عند وجود وكيل موثوق يعيد كتابة هذا الرأس. يستخدم التطبيق رأس Vercel الموثوق تلقائيًا هناك. بغياب عنوان موثوق يطبّق حدود الإرسال على مجموعة مشتركة. |
| `ENABLE_DEMO_PREVIEW` | اتركه `false` للإنتاج. تتيح القيمة `true` المحتوى التوضيحي في النسخ التي تعمل دون اتصال بقاعدة البيانات. |
| `SCHOOL_X_HANDLE` | اختياري. معرّف حساب المدرسة على إكس عند غياب الإعداد المحفوظ في Supabase. |

يمكن توليد سر النماذج محليًا بالأمر التالي ووضع الناتج مباشرة في إعدادات البيئة.

```sh
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
```

## إدارة المحتوى

- **مدير النظام** يدير النشر والإعدادات والوسائط والحسابات والصلاحيات وصندوق الوارد وسجل العمليات.
- **مشرف المحتوى** يراجع مواد المحررين ويحرّرها وينشرها ويدير الوسائط وصندوق الوارد ويراجع سجل العمليات.
- **المحرر** ينشئ مسوداته ويعدّلها ويرسلها للمراجعة ويرفع الملفات وفق صلاحياته.
- **الزائر** يتصفّح المواد المنشورة ويستخدم النماذج العامة.

تعرض الواجهة المواد المنشورة فقط. يدير المحررون أخبار المدرسة وإعلاناتها وفعالياتها والجداول ومحتوى الصفحات من شاشة المحتوى. اختَر العام الدراسي بصيغة `2026/2027` لتفعيل الأرشفة. لإظهار فعالية في التقويم والعدّ التنازلي، حدّد تاريخ بدايتها بتوقيت سلطنة عُمان. يمكن إرفاق PDF بالجداول والموارد، واستخدام ملفات MP4 أو WebM للمعرض. أقصى حجم للملف 4 MiB على Vercel و12 MiB على المضيفين الآخرين. أضف خيارات الاستبانة وتاريخ إغلاقها من محرر المحتوى.

احتفظ بالبيانات الفعلية التي تعتمدها المدرسة في مشروع الإنتاج. اضبط اسم المدرسة والسنة الدراسية وبيانات التواصل وصورة الغلاف من **الإعدادات**. يستقبل صندوق الوارد الرسائل والمقترحات والاستبانات، وتتحقق قاعدة البيانات من الصلاحيات في كل عملية. الملفات المرفقة بمواد منشورة تُعرض عبر روابط موقّعة قصيرة العمر.

### حساب المدرسة على إكس

أضف رابط الحساب الرسمي أو معرّفه في **لوحة الإدارة ← الإعدادات ← حساب المدرسة على إكس**. يظهر الرابط في صفحة الأخبار، ويمكن للزائر اختيار عرض المنشورات العامة من إكس داخل الصفحة. يمكن لنسخة المعاينة دون Supabase قراءة المعرّف من `SCHOOL_X_HANDLE`. لإخفاء الحساب، احفظ الحقل فارغًا في لوحة الإدارة أو أزل متغير البيئة إن كانت النسخة تعمل دون Supabase. [دليل تضمين إكس](https://help.x.com/en/using-x/embed-x-feed)

عند تحرير خبر أو إعلان، يمكنك وضع رابط المنشور الأصلي في حقل **رابط المنشور على إكس**. يظهر الرابط في صفحة التفاصيل بعد نشر المادة. تبقى المنشورات المضمّنة على إكس، وتُدار أخبار البوابة من لوحة الإدارة.

## البناء والنشر

```sh
npm run typecheck
npm run build
npm run start
```

### النشر على Vercel عبر GitHub

1. ارفع ملفات المشروع إلى مستودع GitHub. أبقِ مفاتيح Supabase وسر النماذج في إعدادات بيئة التشغيل، واستبعد `.env.local` من المستودع. [ربط GitHub بـ Vercel](https://vercel.com/docs/git/vercel-for-github)
2. في Vercel اختر **Add New → Project** واستورد المستودع. اختر **Next.js**، واضبط **Root Directory** على المجلد الذي يحتوي على `package.json` ومجلد `app`. استخدم إصدار Node.js ‏22 أو 24 واترك إعدادات البناء الافتراضية. يفتح `index.html` المعاينة الثابتة محليًا، ويشغّل النشر تطبيق Next.js ولوحة الإدارة. [إعداد البناء](https://vercel.com/docs/builds/configure-a-build) · [إصدارات Node.js](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
3. أضف القيم التالية إلى **Environment Variables** في بيئة **Production**. استبدل `YOUR-DOMAIN` بالنطاق الإنتاجي الذي خصصته Vercel للمشروع أو بنطاقك المخصص. [متغيرات البيئة](https://vercel.com/docs/environment-variables)

   | المتغير | قيمة الإنتاج |
   | --- | --- |
   | `NEXT_PUBLIC_SITE_URL` | `https://YOUR-DOMAIN` |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR-PROJECT-REF.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | المفتاح العام من مشروع Supabase. للمفتاح القديم استخدم `NEXT_PUBLIC_SUPABASE_ANON_KEY`. |
   | `SUPABASE_SERVICE_ROLE_KEY` | مفتاح `service_role` الخاص بمشروع Supabase. |
   | `FORM_RATE_LIMIT_SECRET` | سر عشوائي بطول 32 حرفًا على الأقل، ولّده بالأمر الوارد في قسم تهيئة Supabase. |
   | `SCHOOL_X_HANDLE` | `EduGovNBT2362` |
   | `ENABLE_DEMO_PREVIEW` | `false` للإنتاج. استخدم `true` لعرض البيانات التوضيحية الموسومة في نسخة معاينة تعمل دون Supabase. |

4. طبّق ترحيل قاعدة البيانات وأنشئ حساب الإدارة حسب قسم **تهيئة Supabase**. في **Authentication → URL Configuration** اجعل **Site URL** مساويًا لـ `https://YOUR-DOMAIN` وأضف `https://YOUR-DOMAIN/auth/confirm` إلى **Redirect URLs**. استخدم `supabase/templates/invite.html` و`supabase/templates/recovery.html` لقالبَي الدعوة واستعادة كلمة المرور. [عناوين إعادة التوجيه](https://supabase.com/docs/guides/auth/redirect-urls) · [قوالب البريد](https://supabase.com/docs/guides/auth/auth-email-templates)
5. اختر **Deploy**. إذا تغير النطاق بعد النشر الأول، حدّث `NEXT_PUBLIC_SITE_URL` وإعدادات Supabase ثم أعد النشر. حد رفع الوسائط في البوابة على Vercel هو 4 MiB لكل ملف. [حدود طلبات Vercel](https://vercel.com/docs/functions/limitations#request-body-size)

فعّل **Automatically expose System Environment Variables** ليطبّق الموقع حد رفع Vercel ويستخدم نطاق المشروع تلقائيًا عند غياب `NEXT_PUBLIC_SITE_URL`. [متغيرات النظام](https://vercel.com/docs/environment-variables/system-environment-variables)

### النشر على Vercel من سطر الأوامر

من المجلد الذي يحتوي على `package.json`، سجّل الدخول واربطه بمشروع Vercel.

```sh
npx vercel login
npx vercel link
```

أضف متغيرات الإنتاج في لوحة Vercel وأكمل تهيئة Supabase وفق الخطوات أعلاه، ثم نفّذ أمر النشر. [النشر عبر Vercel CLI](https://vercel.com/docs/cli/deploy)

```sh
npx vercel deploy --prod
```

يمكن استخدام مضيف Node.js يدعم `npm ci` و`npm run build` و`npm run start` خلف HTTPS. تظل استضافة قاعدة البيانات والمصادقة والملفات في مشروع Supabase. [نشر Next.js](https://nextjs.org/docs/app/getting-started/deploying)

يولّد `npm run build:sites` حزمة Cloudflare Workers من تطبيق Next.js عبر OpenNext. تتضمن `dist/server/index.js` وملفات الواجهة في `dist/client`. استخدم إعدادات أسرار المضيف لمتغيرات الخادم عند تشغيل النسخة المنشورة. [OpenNext على Cloudflare](https://opennext.js.org/cloudflare/get-started)

بعد الربط، جرّب تسجيل الدخول بأدوار مختلفة ونشر مسودة وإلغاء نشرها ورفع ملف وإرسال نموذج. اختبر عرض المادة والملف في نافذة خاصة بصفتك زائرًا، وتحقق من ظهور الرسالة في صندوق الوارد. للتشغيل الإنتاجي، ضع سياسة احتفاظ للرسائل والاستبانات والنسخ الاحتياطية حسب إجراءات المدرسة.
