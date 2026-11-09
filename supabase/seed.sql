-- بيانات عرض اختيارية. يطبّق هذا الملف بعد الترحيل على مشروع تجريبي.
-- تحذف السجلات الموسومة أو تستبدل قبل إتاحة الموقع الرسمي.
begin;

insert into public.site_settings (key, value)
values
  ('brand_name', to_jsonb('نبض النمارق'::text)),
  ('school_name', to_jsonb('مدرسة النمارق للتعليم الأساسي'::text)),
  ('tagline', to_jsonb('مدرستنا تنبض بالعلم والإبداع'::text)),
  ('hero_title', to_jsonb('مدرستنا تنبض|بالعلم والإبداع'::text)),
  ('hero_description', to_jsonb('نافذتكم إلى مجتمع النمارق المدرسي. تابعوا أخبارنا ومبادراتنا وفعالياتنا، وشاركونا رحلة التعلّم.'::text)),
  ('hero_image_url', to_jsonb('/images/campus.webp'::text)),
  ('hero_image_path', to_jsonb(''::text)),
  ('about_description', to_jsonb('نعمل مع طلبتنا وأولياء أمورهم على بناء بيئة تعليمية آمنة تشجّع الفضول والمعرفة والعمل معًا.'::text)),
  ('current_school_year', to_jsonb(case when extract(month from now() at time zone 'Asia/Muscat') >= 8
    then format('%s/%s', extract(year from now() at time zone 'Asia/Muscat')::int, extract(year from now() at time zone 'Asia/Muscat')::int + 1)
    else format('%s/%s', extract(year from now() at time zone 'Asia/Muscat')::int - 1, extract(year from now() at time zone 'Asia/Muscat')::int) end)),
  ('contact_email', to_jsonb(''::text)),
  ('contact_phone', to_jsonb(''::text)),
  ('contact_address', to_jsonb('سلطنة عُمان'::text)),
  ('office_hours', to_jsonb(''::text)),
  ('map_url', to_jsonb(''::text)),
  ('demo_mode', 'true'::jsonb)
on conflict (key) do nothing;

with school_day as (
  select ((date_trunc('day', now() at time zone 'Asia/Muscat') + interval '9 hours') at time zone 'Asia/Muscat') as morning,
    (select value #>> '{}' from public.site_settings where key = 'current_school_year') as year_name
), sample(kind, slug, title, summary, body, image_url, metadata, start_delta, duration, featured, sort_order) as (
  values
  ('about', 'vision', 'رؤيتنا', 'متعلم مبادر، وبيئة مدرسية ترعى إمكاناته.', 'نسعى إلى بناء بيئة مدرسية يشعر فيها كل طالب بالأمان والانتماء، ويجد فيها فرصة للبحث والإبداع والعمل مع الآخرين.', null, '{}', null, null, false, 1),
  ('about', 'mission', 'رسالتنا', 'نعلّم بالقدوة والتجربة والشراكة مع الأسرة.', 'نعمل على تقديم خبرات تعليمية مرتبطة بحياة الطلبة، وتنمية مهاراتهم وقيمهم عبر الأنشطة الصفية واللاصفية والتواصل المنتظم مع الأسرة.', null, '{}', null, null, false, 2),
  ('about', 'objectives', 'أهدافنا', 'تحسين التعلّم وتنمية المسؤولية والمشاركة.', E'تنمية مهارات القراءة والتفكير العلمي.\nتوسيع فرص العمل التعاوني والابتكار.\nتعزيز المواطنة الإيجابية والعناية بالبيئة المدرسية.', null, '{}', null, null, false, 3),
  ('about', 'school-administration', 'الإدارة المدرسية', 'أدوار فريق الإدارة وخدماته لأفراد المجتمع المدرسي.', E'تتابع إدارة المدرسة الخطط التعليمية، وتنسّق مبادرات دعم الطلبة. يشرف فريق الشؤون الإدارية على استقبال المراجعين وتنظيم المواعيد.\nتضاف أسماء فريق الإدارة وساعات التواصل بعد اعتمادها من المدرسة.', null, '{}', null, null, false, 4),
  ('news', 'robotics-lab', 'النمارق تطلق مختبر الابتكار والروبوت', 'مساحة تعليمية للبرمجة والتجريب والعمل الجماعي، من الفكرة الأولى إلى النموذج القابل للاختبار.', 'جرّبت فرق طلابية بناء روبوتات صغيرة باستخدام مستشعرات الحركة. بدأ اللقاء بتحديد تحدٍ من الحياة اليومية، ثم اختبر الطلبة نماذجهم وشرحوا ما تعلموه لزملائهم.', '/images/robotics.webp', '{"alt":"طلبة يجربون نموذج روبوت في مختبر مدرسي"}', '-1 day', null, true, 1),
  ('news', 'reading-day', 'يوم القراءة يجمع طلبة النمارق', 'جلسات قراءة جماعية وتبادل كتب وأنشطة تلخيص استضافتها المكتبة المدرسية.', 'اختار الطلبة قصصًا قصيرة ودوّنوا أسئلة عن أحداثها وشخصياتها. وشارك متطوعون من الصفوف العليا في تيسير مجموعات القراءة.', '/images/reading.webp', '{"alt":"نشاط قراءة في المكتبة المدرسية"}', '-3 days', null, true, 2),
  ('news', 'art-exhibition-report', 'ألوان النمارق تحكي حكايات الطلبة', 'معرض مدرسي يستعرض أعمالًا فنية تناولت البيئة المحلية والمشاهد اليومية.', 'جرّب الطلبة الرسم بالألوان المائية والطباعة بالقوالب، وقدّموا بطاقات تشرح مصدر إلهامهم والخطوات التي اتبعوها في تنفيذ أعمالهم.', '/images/art.webp', '{"alt":"أعمال فنية في معرض مدرسي"}', '-5 days', null, true, 3),
  ('announcement', 'family-meeting-notice', 'إعلان لقاء أولياء الأمور', 'لقاء مفتوح لمناقشة التعلّم والتواصل مع الأسرة.', 'يُدرج برنامج اللقاء وتفاصيل الحضور بعد اعتمادهما من الإدارة. راجعوا التقويم المدرسي للاطلاع على الموعد التجريبي.', null, '{}', '-1 day', null, true, 1),
  ('announcement', 'club-enrolment', 'فتح التسجيل التجريبي للأندية المدرسية', 'أندية للقراءة والعلوم والفنون ضمن برنامج الأنشطة.', 'يستقبل منسق الأنشطة رغبات الطلبة داخل المدرسة. هذه الصفحة توضح طريقة عرض إعلان التسجيل بعد اعتماد البرنامج.', null, '{}', '-4 days', null, false, 2),
  ('initiative', 'makers-program', 'مبتكرو النمارق', 'مشروع يدرّب الطلبة على تصميم حلول لتحديات من محيطهم المدرسي.', 'تشكل الفرق مجموعات عمل صغيرة وتوثّق مراحل بحثها. تبني كل مجموعة نموذجًا أوليًا وتستخدم ملاحظات زملائها لتحسينه قبل العرض.', '/images/robotics.webp', '{"alt":"مشروع روبوت طلابي"}', null, null, true, 1),
  ('initiative', 'reading-together', 'نقرأ معًا', 'برنامج أسبوعي يخصّص وقتًا للقراءة الحرة وتبادل الترشيحات.', 'يختار كل طالب كتابًا يناسب اهتمامه ويشارك زملاءه فكرة من الكتاب. تتيح المكتبة أنشطةً قصيرة للأسر الراغبة في متابعة القراءة في المنزل.', '/images/reading.webp', '{"alt":"كتب وأنشطة قراءة مدرسية"}', null, null, true, 2),
  ('initiative', 'school-garden', 'حديقتنا مسؤوليتنا', 'أنشطة تعاونية للعناية بالنباتات وترشيد استهلاك المياه.', 'تراقب الفرق نمو النباتات وتسجّل كمية المياه المستخدمة أسبوعيًا. ثم تقترح طرقًا لاختبار أفضل مواعيد الري.', '/images/campus.webp', '{"alt":"المرافق الخارجية للمدرسة في صورة توضيحية"}', null, null, false, 3),
  ('event', 'innovation-week', 'أسبوع الابتكار المدرسي', 'تجارب وعروض طلابية تجمع العلوم والتقنية والفنون.', 'يستعرض الطلبة مشروعاتهم ويشرحون كيف اختبروا أفكارهم. يتضمن البرنامج ورشة بناء النماذج وجولة في ركن الابتكار.', '/images/robotics.webp', '{"location":"مختبر الابتكار","alt":"نشاط الابتكار في المختبر"}', '4 days', '3 hours', true, 1),
  ('event', 'family-meeting', 'ملتقى أولياء الأمور', 'لقاء للتعرّف إلى برامج المدرسة وطرق متابعة تعلّم الطلبة.', 'يتضمن الملتقى جلسة مع فريق الإدارة ووقتًا لمناقشة المقترحات وتنظيم التواصل بين المدرسة والأسرة.', '/images/learning.webp', '{"location":"قاعة المدرسة","alt":"مساحة تعليمية في المدرسة"}', '9 days', '2 hours', true, 2),
  ('event', 'creative-workshop', 'ورشة ألوان من بيئتنا', 'ورشة رسم مستوحاة من الطبيعة والعمارة العُمانية.', 'يتعلم المشاركون اختيار لوحة ألوان وإعداد مسودة بسيطة، ثم يشاركون أعمالهم في جولة صفية قصيرة.', '/images/art.webp', '{"location":"قاعة الفنون","alt":"مواد ورشة رسم مدرسية"}', '16 days', '2 hours', true, 3),
  ('schedule', 'morning-timetable', 'مواعيد الدوام والحصص', 'نموذج يوضح تسلسل الحصص والاستراحة في يوم دراسي.', E'07:15 — بداية اليوم المدرسي\n07:30 — الحصة الأولى\n08:15 — الحصة الثانية\n09:00 — الاستراحة\n09:25 — الحصة الثالثة\n10:10 — الحصة الرابعة\n10:55 — الحصة الخامسة', null, '{}', null, null, false, 1),
  ('schedule', 'activity-timetable', 'جدول الأنشطة الأسبوعية', 'نماذج لأنشطة القراءة والعلوم والفنون.', E'الأحد — نادي القراءة في المكتبة\nالثلاثاء — نادي العلوم في المختبر\nالخميس — نادي الفنون في القاعة متعددة الاستخدامات', null, '{}', null, null, false, 2),
  ('achievement', 'robotics-award', 'تكريم فريق الروبوت المدرسي', 'نموذج لتوثيق تكريم فريق طلابي عن مشروع يحل تحديًا بيئيًا.', 'صمّم الفريق نموذجًا يجمع بيانات بسيطة عن الري ويعرضها بطريقة سهلة. تناول التكريم جهود الطلبة في توثيق تجاربهم وتوزيع أدوارهم.', '/images/award.webp', '{"alt":"تكريم فريق طلابي"}', '-11 days', null, true, 1),
  ('achievement', 'reading-achievement', 'تكريم سفراء القراءة', 'تقدير لمشاركة الطلبة في تنشيط ركن القراءة ومساندة زملائهم.', 'ساهم سفراء القراءة في إعداد قوائم كتب قصيرة وتنظيم لقاءات شهرية للحوار عن الكتب.', '/images/reading.webp', '{"alt":"مكتبة مدرسية وكتب للقراءة"}', '-20 days', null, true, 2),
  ('resource', 'reading-guide', 'دليل القراءة في المنزل', 'خطوات قصيرة للقراءة المشتركة ومناقشة قصة مع الطفل.', E'اختاروا قصة يحبها الطفل واقرؤوا عشر دقائق معًا.\nقبل القراءة، توقّعوا موضوع القصة من الغلاف.\nبعد القراءة، اطلبوا من الطفل أن يروي حدثًا أعجبه ويشرح السبب.\nاكتبوا معًا كلمة جديدة وجملة تستخدمها.', '/images/reading.webp', '{"alt":"كتب في المكتبة المدرسية"}', null, null, true, 1),
  ('resource', 'experiment-log', 'دفتر ملاحظات التجربة العلمية', 'نموذج قابل للنسخ لتنظيم خطوات تجربة علمية.', E'عنوان التجربة:\nسؤال البحث:\nالتوقّع قبل التجربة:\nالأدوات وخطوات التنفيذ:\nالنتائج والملاحظات:\nما الذي يمكن تغييره في التجربة التالية؟', '/images/learning.webp', '{"alt":"أدوات تعليمية في الفصل"}', null, null, false, 2),
  ('parent', 'home-school-contact', 'دليل التواصل بين الأسرة والمدرسة', 'طريقة تنظيم الاستفسار المدرسي ومتابعته مع الفريق المختص.', 'اذكروا موضوع الاستفسار وطريقة التواصل المناسبة عند استخدام نموذج التواصل. لا تضيفوا أرقام الهوية أو التقارير الصحية أو تفاصيل شخصية تخص الطلبة.', null, '{}', null, null, false, 1),
  ('parent', 'study-routine', 'تنظيم وقت المذاكرة', 'أفكار لأنشطة قصيرة ومتكررة تساعد على تثبيت التعلّم.', 'اتفقوا مع الطفل على وقت ثابت للمذاكرة، وحددوا مهمة صغيرة كل مرة. اختموا بنشاط سهل يوضح ما استطاع أن ينجزه بنفسه.', '/images/learning.webp', '{"alt":"بيئة تعليمية داعمة"}', null, null, false, 2),
  ('survey', 'family-activities-survey', 'أي الأنشطة تودّون حضورها مع أبنائكم؟', 'استبانة تجريبية للتعرّف إلى اهتمامات أولياء الأمور.', 'اختاروا النشاط الأقرب إلى اهتماماتكم. يطّلع فريق المدرسة على الردود من لوحة الإدارة.', null, '{"options":["ورشة القراءة المشتركة","ورشة العلوم والابتكار","ورشة الفنون"]}', '-1 day', '25 days', true, 1),
  ('survey', 'education-library-survey', 'أي مواد المكتبة تحتاجون إليها؟', 'استبانة تجريبية لتخطيط المواد التعليمية المنشورة للأسر.', 'اختاروا نوع المادة التي تفيدكم في متابعة التعلّم في المنزل.', null, '{"options":["أدلة القراءة","نماذج تجارب علمية","أنشطة إثرائية"]}', '-1 day', '30 days', false, 2),
  ('calendar', 'learning-review', 'مراجعة أعمال التعلّم', 'محطة أسبوعية لتوثيق أعمال الطلبة وتحديد الخطوة التعليمية التالية.', 'تجمع الصفوف عينات من الأعمال وتراجعها مع الطلبة لاختيار أهداف تعلّم قصيرة للأسبوع التالي.', null, '{"location":"الصفوف الدراسية"}', '12 days', '1 hour', false, 1),
  ('calendar', 'class-project-day', 'يوم عرض المشروعات الصفية', 'موعد عرض تجريبي للمشروعات وتبادل التغذية الراجعة.', 'تشارك مجموعات الطلبة عروضًا قصيرة عن مشروعاتها وتناقش نتائج التجارب وأسئلة الزملاء.', null, '{"location":"قاعة الأنشطة"}', '21 days', '2 hours', false, 2),
  ('gallery', 'gallery-campus', 'من أروقة المدرسة', 'صورة توضيحية لبيئة تعليمية عُمانية.', 'صورة عرض تجريبية ضمن المعرض الإعلامي المدرسي.', '/images/campus.webp', '{"alt":"المبنى المدرسي في مشهد توضيحي"}', '-10 days', null, true, 1),
  ('gallery', 'gallery-learning', 'لحظات تعلّم', 'نشاط تعليمي يدعو إلى العمل والتعاون.', 'صورة عرض تجريبية ضمن المعرض الإعلامي المدرسي.', '/images/learning.webp', '{"alt":"تفاعل طلابي في بيئة تعليمية"}', '-10 days', null, true, 2),
  ('gallery', 'gallery-robotics', 'تجارب مختبر الابتكار', 'تجربة تعليمية تجمع البرمجة والعمل اليدوي.', 'صورة عرض تجريبية ضمن المعرض الإعلامي المدرسي.', '/images/robotics.webp', '{"alt":"نشاط الروبوت والبرمجة في المدرسة"}', '-9 days', null, true, 3),
  ('gallery', 'gallery-reading', 'في مكتبة النمارق', 'مساحة للقراءة والبحث واللقاءات الطلابية.', 'صورة عرض تجريبية ضمن المعرض الإعلامي المدرسي.', '/images/reading.webp', '{"alt":"أنشطة القراءة في مكتبة مدرسية"}', '-8 days', null, true, 4),
  ('gallery', 'gallery-award', 'لحظات التكريم', 'توثيق تجريبي لتكريم الفرق الطلابية.', 'صورة عرض تجريبية ضمن المعرض الإعلامي المدرسي.', '/images/award.webp', '{"alt":"لحظة تكريم في المدرسة"}', '-8 days', null, true, 5),
  ('gallery', 'gallery-art', 'من معرض الفنون', 'أعمال فنية تستلهم البيئة المحلية.', 'صورة عرض تجريبية ضمن المعرض الإعلامي المدرسي.', '/images/art.webp', '{"alt":"أعمال طلبة في معرض فني"}', '-7 days', null, true, 6),
  ('partnership', 'community-reading', 'القراءة بالشراكة مع المجتمع', 'مقترح تعاون مع أولياء الأمور ومتطوعي المجتمع لتنظيم لقاءات قراءة.', 'يدعو المشروع المتطوعين إلى إعداد أنشطة قصيرة واختيار كتب تناسب أعمار الطلبة، بالتنسيق مع أمين المكتبة وإدارة المدرسة.', '/images/reading.webp', '{"alt":"قراءة جماعية في مكتبة مدرسية"}', null, null, false, 1),
  ('partnership', 'community-science', 'خبرات من المجتمع إلى الصف', 'مقترح لاستضافة متحدثين يربطون العلوم بالمهن والبيئة المحلية.', 'يختار فريق المدرسة موضوعات قصيرة تناسب المراحل الدراسية وينسق موافقات الزيارات مع الجهات والأفراد المشاركين.', '/images/learning.webp', '{"alt":"نشاط تعليمي داخل الصف"}', null, null, false, 2),
  ('stat', 'students-total', 'الطلبة', '', '', null, '{"value":428,"label":"طالبًا وطالبة","icon":"graduation-cap"}', null, null, true, 1),
  ('stat', 'teachers-total', 'الكوادر التعليمية', '', '', null, '{"value":36,"label":"معلّمًا ومعلّمة","icon":"users"}', null, null, true, 2),
  ('stat', 'projects-total', 'المبادرات', '', '', null, '{"value":18,"label":"مبادرة تعليمية","icon":"lightbulb"}', null, null, true, 3),
  ('stat', 'awards-total', 'الإنجازات', '', '', null, '{"value":12,"label":"إنجازًا مدرسيًا","icon":"trophy"}', null, null, true, 4),
  ('contact', 'school-correspondence', 'راسلوا إدارة المدرسة', 'نستقبل استفساراتكم ومقترحاتكم عبر النموذج.', 'يُعرض البريد ورقم الهاتف وعنوان الزيارة بعد إدخال البيانات المعتمدة من إدارة المدرسة. تجنّبوا مشاركة البيانات الحساسة في النموذج.', null, '{}', null, null, false, 1)
)
insert into public.content (kind, slug, title, summary, body, image_url, metadata, start_at, end_at, status, school_year, featured, sort_order, is_demo, published_at)
select kind, slug, title, summary, body, image_url, metadata::jsonb,
  morning + start_delta::interval, morning + start_delta::interval + duration::interval,
  'published', year_name, featured, sort_order, true,
  case when start_delta::interval < interval '0 seconds' then morning + start_delta::interval else now() end
from sample cross join school_day
on conflict (slug) do nothing;

with previous_year as (
  select format('%s/%s', left(value #>> '{}', 4)::int - 1, left(value #>> '{}', 4)::int) as year_name
  from public.site_settings where key = 'current_school_year'
), sample(kind, slug, title, summary, body, image_url, alt, sort_order) as (
  values
  ('news', 'reading-club-archive', 'نادي القراءة يبدأ لقاءاته', 'خبر تجريبي من أرشيف العام الدراسي السابق.', 'اجتمع أعضاء النادي لاختيار القصص التي سيقرؤونها معًا، وتوزيع أدوار إعداد اللقاءات الأسبوعية.', '/images/reading.webp', 'لقاء قراءة في مكتبة مدرسية', 20),
  ('event', 'student-exhibits-archive', 'معرض المشروعات الصفية', 'عرض تجريبي لمشروعات العام الدراسي السابق.', 'شارك الطلبة نماذجهم العلمية والفنية مع زملائهم ضمن جولة مدرسية قصيرة.', '/images/art.webp', 'أعمال مدرسية معروضة', 20),
  ('initiative', 'responsible-energy-archive', 'نستخدم الطاقة بمسؤولية', 'مبادرة تجريبية من أرشيف الأنشطة.', 'وثّق الطلبة طرق استخدام الطاقة في المدرسة، وعرضوا أفكارًا صغيرة لتقليل الاستهلاك.', '/images/robotics.webp', 'أدوات مشروع تقني في مختبر', 20),
  ('achievement', 'creative-arts-archive', 'تكريم المشاركين في معرض الفنون', 'توثيق تجريبي لتكريم أنجز في العام الدراسي السابق.', 'قدّم فريق الأنشطة شهادات مشاركة للطلبة الذين أعدوا أعمالًا فنية للمعرض.', '/images/award.webp', 'مشهد توضيحي للتكريم المدرسي', 20)
)
insert into public.content (kind, slug, title, summary, body, image_url, metadata, start_at, status, school_year, sort_order, is_demo, published_at)
select kind, slug, title, summary, body, image_url, jsonb_build_object('alt', alt), now() - interval '1 year',
  'published', year_name, sort_order, true, now() - interval '1 year'
from sample cross join previous_year
on conflict (slug) do nothing;

insert into public.content (kind, slug, title, summary, body, status, school_year, is_demo)
select 'announcement', 'example-draft', 'إعلان قيد الإعداد', 'مسودة تجريبية تظهر للمخوّلين في لوحة الإدارة.', '', 'draft', value #>> '{}', true
from public.site_settings where key = 'current_school_year' on conflict (slug) do nothing;

insert into public.content (kind, slug, title, summary, body, status, school_year, is_demo)
select 'initiative', 'example-review', 'مبادرة قيد المراجعة', 'سجل تجريبي لعرض سير المراجعة في لوحة الإدارة.', '', 'review', value #>> '{}', true
from public.site_settings where key = 'current_school_year' on conflict (slug) do nothing;

commit;
