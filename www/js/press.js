/* press.js — الصحافة: عشر صحف ومواقع بنبرات مختلفة تكتب أخبارًا متنوعة عن لاعبي العالم كلهم (والمستخدم)، مع مديح وانتقاد واسعين.
 * مصدر الأخبار: أداء لاعبي النخبة أسبوعيًا (هاتريك، ثنائية، صناعة، نجم الجولة، كارثة، جفاف تهديفي، سلسلة، إصابة)،
 * قصص الدوريات (مفاجآت، صدارة، أزمات الكبار)، دوري الأبطال، الشائعات، المواهب والمخضرمون، الكرة الذهبية، كأس العالم/آسيا، ومباريات المستخدم وموسمه.
 * قاعدة ذهبية: لا U.rnd هنا أبدًا — كل «صدفة» تجزئة ثابتة من (البذرة|الموسم|المفتاح) فلا يتأثر مسار المحاكاة ولا الاختبارات.
 * الأخبار للقراءة فقط (لا تغيّر الشعبية أو الثقة)، ما عدا ملء صندوق الرسائل للأحداث الكبرى عن المستخدم. */
(function (G) {
  'use strict';
  const U = G.U, P = (id) => G.S.players[id], C = (id) => G.S.clubs[id];
  const Press = (G.Press = {});
  const clamp = U.clamp;
  const FEED_MAX = 150;

  function h01(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }
  const seedOf = () => String(G.S.seed != null ? G.S.seed : (G.S.created || 0)) + '|' + G.S.season;
  const H = (key) => h01(seedOf() + '|' + key);
  const pickH = (arr, key) => arr[Math.floor(H(key) * arr.length) % arr.length];
  const sur = (p) => String(p.n).split(/\s+/).slice(-1)[0];
  const fill = (s, ctx) => String(s).replace(/\{(\w+)\}/g, (_, k) => (ctx[k] != null ? ctx[k] : '')).replace(/([لبوف])ـال/g, '$1ال').replace(/لال/g, 'لال').replace(/ـ(ال)/g, '$1');

  // ---------- الصحف: النبرة [مديح، نقد، خبر] وميل كل صحيفة إلى أنواع الأخبار ----------
  // ملاحظة: كل الأسماء خيالية.
  Press.OUTLETS = [
    { id: 'mal', n: 'الملعب اليوم', ic: '📰', tone: [0.22, 0.22, 0.56], aff: { lg: 3, ucl: 1.5 } },
    { id: 'sada', n: 'صدى الكرة', ic: '🔥', tone: [0.25, 0.50, 0.25], aff: { user: 2.5, hat: 1.5, stinker: 3, drought: 3, crisis: 3, injury: 1.5 } },
    { id: 'tahlil', n: 'المحلّل الرياضي', ic: '📊', tone: [0.26, 0.28, 0.46], aff: { star: 2.5, assist: 2.5, lg: 3, ucl: 2, stinker: 1.5 } },
    { id: 'jam', n: 'صوت الجماهير', ic: '📣', tone: [0.48, 0.34, 0.18], aff: { user: 3, hat: 2, brace: 2, streak: 2.5, stinker: 2, crisis: 2 } },
    { id: 'njum', n: 'نجوم الكرة', ic: '🌟', tone: [0.52, 0.16, 0.32], aff: { rumor: 2.5, user: 2, bdm: 2, bdc: 2, hat: 1.5 } },
    { id: 'euro', n: 'البوابة الأوروبية', ic: '🏟', tone: [0.28, 0.26, 0.46], aff: { ucl: 5, lg: 1.5, bdm: 1.5 } },
    { id: 'alam', n: 'الكرة العالمية', ic: '🌍', tone: [0.30, 0.26, 0.44], aff: { tour: 6, bdc: 2, veteran: 1.5 } },
    { id: 'mer', n: 'ميركاتو', ic: '🔁', tone: [0.20, 0.25, 0.55], aff: { rumor: 6, injury: 1.5 } },
    { id: 'mizan', n: 'الميزان', ic: '🧠', tone: [0.14, 0.58, 0.28], aff: { stinker: 3, drought: 3, crisis: 3, bdm: 3, bdc: 3, veteran: 3, user: 2 } },
    { id: 'jil', n: 'جيل الغد', ic: '🌱', tone: [0.62, 0.12, 0.26], aff: { young: 8, user: 1.5 } }
  ];
  const LEADS = {
    mal: { p: ['', 'تقرير:'], c: ['', 'تقرير:'], n: ['', 'من الملاعب:'] },
    sada: { p: ['يا له من أداء!', 'الشارع الرياضي يتحدث:'], c: ['صدمة في الأوساط الرياضية!', 'الغضب يجتاح المدرجات:', 'عاجل ومزعج:'], n: ['عاجل من الملاعب:', 'حديث الساعة:'] },
    tahlil: { p: ['قراءة تكتيكية:', 'بالأرقام:'], c: ['ملاحظات نقدية:', 'تحليل سلبي:'], n: ['قراءة في المشهد:', 'بالأرقام:'] },
    jam: { p: ['الجماهير تهتف:', 'المدرجات تحتفل:'], c: ['غضب الجماهير:', 'المدرجات غاضبة:'], n: ['صوت الشارع الكروي:'] },
    njum: { p: ['حصري:', 'خلف الكواليس:'], c: ['تسريبات:', 'مصادر خاصة:'], n: ['من الكواليس:', 'حصري:'] },
    euro: { p: ['من القارة العجوز:'], c: ['من القارة العجوز:'], n: ['أوروبيًا:'] },
    alam: { p: ['عالميًا:'], c: ['عالميًا:'], n: ['عالميًا:', 'من العالم:'] },
    mer: { p: ['ميركاتو:'], c: ['ميركاتو:'], n: ['ميركاتو:', 'سوق الانتقالات:'] },
    mizan: { p: ['إنصاف:', 'رأي:'], c: ['رأي حاد:', 'نقد لاذع:', 'الميزان:'], n: ['ميزان الأسبوع:'] },
    jil: { p: ['نجوم الغد:'], c: ['تحذير:'], n: ['جيل الغد:'] }
  };
  const TONE_AR = { p: 'مديح', c: 'نقد', n: 'خبر' };
  Press.TONE_AR = TONE_AR;

  // ---------- قوالب الأخبار: [العنوان، الجسم] لكل (النوع × النبرة) ----------
  // المتغيرات: {p} الاسم الأخير {P} الاسم الكامل {c} النادي {opp} الخصم {g} {a} {gt} {at} {ar} {pos} {nat} {lg} {sc} {k} {x} {rank} {age} {ovr} {y}
  const T = {
    hat: {
      p: [['{p} يقود {c} إلى فوز كبير بهاتريك مدوٍّ', 'سجّل {p} {g} أهداف في مباراة واحدة وقاد {c} إلى انتصار مستحق. أداء هجومي استثنائي رفع رصيده إلى {gt} هدفًا هذا الموسم.'],
        ['ليلة {p}: {g} أهداف وجماهير {c} تحتفل', 'لم يترك {p} للمدافعين فرصة للتنفس؛ {g} أهداف في شباك الخصم ليؤكد أنه من أخطر مهاجمي {lg}.'],
        ['{p} يسحق الدفاعات ويرفع رصيده إلى {gt} هدفًا', 'ثلاثية جديدة تضاف إلى سجلّ {p} هذا الموسم، وتتحول أهدافه الـ{gt} إلى حديث الصحافة في كل الملاعب.'],
        ['نجم الأسبوع بلا منازع: {p}', 'بهاتريك لافت فرض {p} نفسه نجم الجولة وعزّز موقع {c} في سباق المراكز المتقدمة.'],
        ['{p} يحوّل المباراة إلى عرض شخصي', '{g} أهداف بتوقيعه وحضور هجومي لا يُصدَّق. {p} في أفضل حالاته وسط إشادة واسعة من النقاد.']],
      c: [['هاتريك {p}… لكن هل يكفي لإخفاء مشاكل {c}؟', 'رغم أهداف {p} الـ{g}، ما زال دفاع {c} يتلقى الأهداف بسهولة، وهو ما يثير قلق المتابعين قبل المراحل الحاسمة.'],
        ['أرقام {p} مبهرة، لكن الألقاب لا تُحسم بالأهداف الفردية', 'يرى محللون أن نجاح {p} الفردي لا يعكس بالضرورة قوة {c} الجماعية، وأن الاختبارات الحقيقية لم تأتِ بعد.'],
        ['هل ضخّمت الصحافة هاتريك {p}؟', 'أمام خصم متواضع الدفاع، لا يرى ناقدون أن هاتريك {p} يستحق كل هذا الضجيج.']],
      n: [['{g} أهداف لـ{p}: ماذا بعد؟', 'وضع {p} نفسه في قلب الحديث بعد أن سجّل {g} أهداف مع {c}. الأرقام تقول: {gt} هدفًا في الموسم.'],
        ['{p} يتصدر عناوين الجولة', 'كانت أمسية ناجحة لمهاجم {c}، وستنتظر الأنظار حضوره في المباراة المقبلة.']]
    },
    brace: {
      p: [['ثنائية {p} تمنح {c} نقاطًا ثمينة', 'سجّل {p} هدفين حاسمين هذا الأسبوع ليواصل تألقه برصيد {gt} هدفًا.'],
        ['{p} يواصل النزيف في شباك الخصوم', 'ثنائية جديدة وثقة كبيرة. {p} يثبت أنه رأس الحربة المنتظر لـ{c}.'],
        ['ثنائية تُقرّب {c} من القمة', 'هدفان لـ{p} حسما اللقاء وأعادا الحديث عن دوره المحوري في نجاحات الفريق.']],
      n: [['{p} يسجّل ثنائية ويتقدّم في ترتيب الهدّافين', 'بعد ثنائيته الأخيرة بات {p} من أبرز الهدّافين برصيد {gt} هدفًا هذا الموسم.'],
        ['ثنائية في سجلّ {p}', 'ثنائية جديدة لمهاجم {c} في طريقه إلى موسم لافت.']],
      c: [['ثنائية {p} لا تكفي: {c} يترنّح دفاعيًا', 'رغم هدفي {p}، ما زال {c} يعاني خلفيًا، وهذا ما يقلق جماهيره.']]
    },
    assist: {
      p: [['{p}: صانع الألعاب الذي يصنع الفارق', '{a} تمريرات حاسمة هذا الأسبوع! {p} يثبت أنه العقل المدبّر في {c}.'],
        ['{a} صناعات في جولة واحدة: {p} في قمة الإبداع', 'رؤية استثنائية وتمريرات تقتل الدفاعات؛ {p} يرتقي بمستوى {c}.'],
        ['لمسات {p} السحرية تقود {c}', 'بدّل {p} إيقاع المباراة بتمريراته وفتح لزملائه أبواب شباك الخصم {a} مرات.']],
      n: [['{p} يتصدر الصنّاع بعد جولة مميزة', 'تمريراته الحاسمة رفعت رصيده إلى {at} صناعة، وسط اهتمام متزايد من الأندية الكبرى.']]
    },
    star: {
      p: [['{p} الأفضل في الملعب بلا منازع', 'نال {p} تقييمًا شبه كامل ({ar} هذا الموسم) وقاد {c} إلى أداء مقنع.'],
        ['أداء كبير من {p} يستحق التصفيق', 'سيطر {p} على وسط الملعب وفرض إيقاعه فاستحق وصفه بنجم الجولة.'],
        ['{p}: درس في الأداء المتكامل', 'قال متابعون: «يؤدي {p} كأنه يلعب وحده»، في إشارة إلى تأثيره الكبير مع {c}.']],
      n: [['{p} ضمن تشكيلة الأسبوع', 'اختارته لجنة الصحافة ضمن أفضل لاعبي الجولة بعد أداء قوي مع {c}.']],
      c: [['{p} متألق لكن الفريق متعثّر', 'رغم مستوى {p} المرتفع، لم يحسن {c} استثمار أدائه وبقيت النتائج دون الطموح.']]
    },
    stinker: {
      c: [['كارثة {p}: أسوأ مباراة هذا الموسم؟', 'ظهر {p} بعيدًا عن مستواه وتسبب في أخطاء كلّفت {c} غاليًا. تقييمه هذا الأسبوع لم يتجاوز {x}.'],
        ['{p} يُغضب جماهير {c}', 'أداء باهت وأخطاء ساذجة؛ الجماهير لم تُخفِ غضبها من نجم الفريق.'],
        ['هل فقد {p} بريقه؟', 'بعد أداء مخيّب ارتفعت الأصوات المطالبة بإراحة {p} أو إعادة تقييم دوره في {c}.'],
        ['صفر بلا أثر: {p} يغيب وهو على أرض الملعب', 'لم يترك {p} أي بصمة وصار محور انتقادات حادة بعد تعثر {c}.']],
      p: [['دفاعًا عن {p}: يوم سيّئ لا يمحو موسمًا كاملًا', 'يُجمع كثيرون على أن {p} يملك من الجودة ما يعوّض تعثّر مباراة، وعلى {c} أن يقف خلفه.'],
        ['الجماهير تساند {p} رغم الأداء المخيّب', 'وقفت جماهير {c} خلف نجمها وطالبت بمنحه الثقة والوقت.']],
      n: [['{p} يعتذر: سأعود أقوى', 'اعترف {p} بأن أداءه لم يكن في المستوى وتعهد بتعويض الجماهير في المباراة المقبلة.']]
    },
    drought: {
      c: [['{p} يعاني الجفاف: {k} أسابيع بلا هدف', 'لم يهزّ {p} الشباك منذ {k} أسابيع وبدأ الضغط يزداد على مهاجم {c}.'],
        ['أزمة تهديف لـ{p}… وماذا يقول المدرب؟', 'غياب أهدافه أربك حسابات {c}، والصحافة تتساءل عن سر الصيام التهديفي.'],
        ['{p} في نفق مظلم', 'تتزايد الأسئلة حول مستوى {p} بعد فترة طويلة بلا أهداف.']],
      n: [['{p} يبحث عن هدفه الضائع', 'لا تزال الأهداف غائبة عن {p}، لكن المحللين يرون أن الفرص موجودة وأن العودة قريبة.']],
      p: [['ثقوا بـ{p}: العاصفة تسبق الهدوء', 'يرى مقرّبون أن {p} على بعد هدف واحد من استعادة ثقته الكاملة.']]
    },
    streak: {
      p: [['{p} لا يتوقف: يسجّل للأسبوع الخامس تواليًا', 'يواصل {p} هزّ الشباك في كل جولة ويكتب فصلًا جديدًا من تألقه مع {c}.'],
        ['سلسلة مذهلة لـ{p}', 'خمس جولات متتالية والكرة تعانق شباك الخصوم بتوقيع {p}. هل من يوقفه؟'],
        ['{p} في أفضل فتراته', 'تتكرر أهدافه وتتسع شهرته، و{c} يجني ثمار تألقه.']],
      n: [['إلى متى تستمر سلسلة {p}؟', 'يتساءل المتابعون: هل يواصل {p} الهزّ المتتالي؟']]
    },
    injury: {
      n: [['إصابة {p} تُربك {c}', 'تأكد غياب {p} بسبب الإصابة لعدة أسابيع، وهو ما يُعد خسارة مؤثرة للفريق.'],
        ['خبر مؤلم: {p} في قائمة المصابين', 'فقد {c} أحد أبرز نجومه {p}، وسط تمنيات بعودة سريعة.']],
      c: [['{c} يدفع ثمن غياب {p}', 'يشعر المتابعون أن غياب {p} سيضرب حسابات {c} في المراحل المقبلة مع قلّة البدائل.']],
      p: [['لاعبو {c} يتضامنون مع {p}', 'رسائل دعم تتهاطل على {p} بعد إصابته وأمل كبير في أن يعود قويًا.']]
    },
    upset: {
      n: [['مفاجأة الجولة: {c} يسقط أمام {opp} ({sc})', 'في واحدة من أكبر مفاجآت الأسبوع خسر {c} أمام {opp} بنتيجة {sc}، ما يغيّر حسابات المنافسة في {lg}.'],
        ['{opp} يُطيح بـ{c} في مباراة مثيرة', 'نتيجة صادمة ({sc}) قلبت جدول {lg} رأسًا على عقب.']],
      c: [['أزمة {c}: الخسارة أمام {opp} تُشعل الغضب', 'النتيجة ({sc}) أثارت غضب جماهير {c} ووضعت الجهاز الفني في موقف حرج.']],
      p: [['{opp} يكتب فصلًا جميلًا بالفوز على {c}', 'فريق شجاع وجماهير مؤمنة: {opp} يبهر الجميع بالفوز على {c} ({sc}).']]
    },
    fest: {
      n: [['عرض هجومي: {sc} بين {c} و{opp}', 'شهد لقاء {c} و{opp} سيلًا من الأهداف انتهى {sc}، في واحدة من أمتع مباريات {lg} هذا الموسم.']],
      p: [['مهرجان أهداف يرضي عشّاق {lg}', 'نتيجة {sc} تعكس متعة كروية خالصة بين {c} و{opp}.']],
      c: [['دفاعات هشّة في {c} و{opp}', 'الأهداف الكثيرة ({sc}) تكشف عن عيوب دفاعية فاضحة لدى الفريقين.']]
    },
    leader: {
      p: [['{c} يعتلي صدارة {lg}', 'بعد جولة موفقة تصدّر {c} جدول {lg} برصيد {x} نقطة، وسط إشادة بأداء مدرّبه ولاعبيه.']],
      n: [['تغيير في الصدارة: {c} يأخذ المركز الأول', 'اهتزّ جدول {lg} هذا الأسبوع، و{c} يعتلي القمة.']],
      c: [['{opp} يفقد الصدارة: ماذا حدث؟', 'فقد {opp} صدارة {lg} بعد تعثر مفاجئ، والصحافة تتساءل عن أسباب التراجع.']]
    },
    crisis: {
      c: [['أزمة في {c}: المركز {rank} لا يليق باسمه', 'يعيش {c} موسمًا مخيّبًا في {lg} بعد أن تراجع إلى المركز {rank}، والضغوط تزداد على الإدارة والجهاز الفني.'],
        ['{c} في دوامة: الجماهير تطالب بالتغيير', 'نتائج متذبذبة ومستوى متراجع يضعان {c} تحت المجهر في المرحلة الراهنة.'],
        ['إلى أين يتجه {c}؟', 'بعد مرور {k} أسبوعًا لا يزال {c} بعيدًا عن مكانته المعتادة بين الكبار.']],
      n: [['{c} يبحث عن مخرج من الأزمة', 'وعود بالتصحيح وسط ضغط جماهيري كبير على {c} ونتائج لا تُرضي أحدًا.']],
      p: [['ثقة بإدارة {c}: «العاصفة ستمرّ»', 'يرى أنصار {c} أن الفريق يملك من الجودة ما يخرجه من أزمته قريبًا.']]
    },
    ucl: {
      n: [['دوري الأبطال: {c} يتغلب على {opp} ({sc})', 'ضمن الأمسية الأوروبية حسم {c} مواجهته مع {opp} بنتيجة {sc}.']],
      p: [['ليلة أوروبية مثالية لـ{c}', 'أبهر {c} القارة بفوزه ({sc}) على {opp} ووجّه رسالة قوية لمنافسيه في دوري الأبطال.']],
      c: [['{opp} يفشل في الاختبار الأوروبي', 'سقوط ({sc}) أمام {c} يضع {opp} في موقف صعب في دوري الأبطال.']]
    },
    uclwin: {
      p: [['{c} بطل أوروبا!', 'توّج {c} بلقب دوري أبطال أوروبا بعد مسيرة رائعة، وجماهيره تحتفل حتى الصباح.'], ['مجد أوروبي جديد لـ{c}', 'رفع {c} الكأس ذات الأذنين، ليكتب فصلًا جديدًا في تاريخه.']],
      c: [['{opp} يخسر النهائي… ويبكي الحلم', 'ودّع {opp} نهائي دوري الأبطال بخيبة أمل كبيرة وتساؤلات عن اختيارات مدرّبه.']],
      n: [['حصاد دوري الأبطال: {c} على العرش', 'نستعرض أبرز ما حدث في موسم دوري الأبطال بعد تتويج {c}.']]
    },
    rumor: {
      n: [['{p} على رادار {x}: هل يرحل عن {c}؟', 'تقارير تربط اسم {p} بالانتقال إلى {x} في الميركاتو القادم بينما يلتزم {c} الصمت.'],
        ['«{x} يتحرك لضم {p}»', 'بحسب مصادر، وضع {x} {p} على رأس قائمة أمنياته، لكن الصفقة تحتاج إلى مبلغ ضخم.']],
      c: [['{p} يربك {c}: الشائعات تخرج عن السيطرة', 'تتصاعد الشائعات حول مستقبل {p} وسط توتر داخل غرفة ملابس {c}.']],
      p: [['{p} وفاءً لـ{c}: لن أرحل', 'نفى {p} الأنباء حول رحيله مؤكدًا سعادته مع {c}.']]
    },
    young: {
      p: [['مواهب الغد: {P} ({c}) يقتحم الواجهة', 'بعمر {age} سنة يلفت {P} الأنظار بتقييم {ovr} وإمكانات هائلة. مستقبل مشرق ينتظر لاعب {c}.'],
        ['جيل جديد: {p} ظاهرة موسمه', 'كشّافو الأندية الكبرى يتابعون {p} عن كثب بعد أرقامه اللافتة.']],
      n: [['قائمة أفضل الشباب: {x}', 'نظرة على أبرز المواهب الصاعدة هذا الموسم: {x}.']],
      c: [['حذارِ من الإفراط في الاحتفاء: {p} لم يثبت بعد', 'يحذّر محللون من أن تحميل {p} فوق طاقته قد يهدد مستقبله مع {c}.']]
    },
    veteran: {
      p: [['{p}: العمر مجرد رقم', 'في سن {age} لا يزال {p} يتألق مع {c} ويعطي دروسًا في الالتزام.']],
      n: [['{p} يقترب من الاعتزال؟ لا يبدو ذلك', 'رغم بلوغه {age} عامًا يحتفظ {p} بمستوى جيد مع {c}.']],
      c: [['هل حان وقت رحيل {p}؟', 'مع تقدّم العمر بـ{p} ({age} عامًا) تتصاعد التساؤلات حول جدوى استمراره مع {c}.']]
    },
    bdm: {
      p: [['{p} يتصدر سباق الكرة الذهبية', 'بعد التحديث الشهري تصدّر {p} ({c}) قائمة المرشحين بـ{x} نقطة وسط تأييد واسع.']],
      n: [['الكرة الذهبية: {p} يطارد الصدارة', 'يحافظ {p} على موقعه بين أبرز المرشحين والفارق عن المتصدر {x} نقاط فقط.']],
      c: [['هل يستحق {p} الصدارة؟ جدل حول الكرة الذهبية', 'يرى منتقدون أن ترتيب {p} لا يعكس أداءه الفعلي وأن لاعبين آخرين أولى بالمركز.']]
    },
    bdc: {
      p: [['{p} يتوّج بالكرة الذهبية {y}', 'بإجماع كبير فاز {p} ({c}) بالكرة الذهبية {y} بعد موسم استثنائي.']],
      c: [['ظُلم {p}: الكرة الذهبية تُمنح لغيره!', 'رأت صحف كثيرة أن {p} كان الأحق بالكرة الذهبية {y} وأن الاختيار أثار جدلًا واسعًا.']],
      n: [['الكرة الذهبية {y}: القائمة النهائية', 'تعرّف على أفضل عشرة لاعبين في العالم لهذا العام وعلى رأسهم {p}.']]
    },
    tourwin: {
      p: [['{nat} بطل {x}!', 'توَّج منتخب {nat} بلقب {x} بعد مسيرة رائعة، ولاعبوه يحتفلون في الملعب.']],
      c: [['خروج مدوٍّ لـ{nat} من {x}: الجماهير غاضبة', 'ودّع المرشّح الأبرز بطولة {x} مبكرًا وبدأت المطالبات برحيل المدير الفني.']],
      n: [['حصاد {x}: أبرز المفاجآت والنجوم', 'في ختام {x} نستعرض أبرز ما حدث: {k}.']]
    },
    tourup: {
      n: [['مفاجأة {x}: {opp} يطيح بـ{c}', 'لن ينسى عشاق الكرة ما فعله {opp} بالإطاحة بـ{c} في {x}.']],
      p: [['{opp} يبهر العالم في {x}', 'فريق متواضع الإمكانات يهزم {c} ويكتب قصة لا تُنسى.']],
      c: [['كارثة {c}: السقوط أمام {opp} في {x}', 'خرج {c} من حساباته أمام {opp} بصورة لا تليق بمكانته.']]
    },
    uPraise: {
      p: [['{p} يصنع الفارق مع {c} أمام {opp}', 'أداء مبهر من {p} أمام {opp}: {k} وتقييم {r}. الجماهير والصحافة تُجمعان على أنه نجم الليلة.'],
        ['{p} يخطف الأضواء أمام {opp}', 'تألق لافت: {k}، وتقييم {r} يكفي لوصفه بأفضل لاعب في الملعب.'],
        ['نجمنا الجديد: {p} يتألق مجددًا أمام {opp}', 'يواصل {p} فرض نفسه في تشكيلة {c} بأداء ناضج أمام {opp} ({k}).'],
        ['{p} يقلب الطاولة على {opp}', 'تدخّل {p} في اللحظات الحاسمة ({k}) وسلّم {c} مباراة مريحة بتقييم {r}.'],
        ['«إنه مختلف»: الصحافة تتغنّى بـ{p} بعد {opp}', 'تقييم {r} وبصمة واضحة أمام {opp} ({k}) جعلا {p} حديث المتابعين بعد المباراة.'],
        ['{p} يرفع سقف التوقعات بعد مواجهة {opp}', 'مع كل مباراة يزداد وهج {p}؛ أمام {opp} قدّم {k} وبرهن أنه من الأسماء الصاعدة بقوة.']],
      n: [['{p} ضمن الأفضل في مواجهة {opp}', 'سجّل {p} حضورًا جيدًا أمام {opp} ({k}) بتقييم {r} ضمن تشكيلة الأسبوع.']],
      c: [['هل بالغت الصحافة في مدح {p} بعد {opp}؟', 'يرى بعض المحللين أن الإشادة بـ{p} سابقة لأوانها وأن العبرة بالاستمرار طوال الموسم.'],
        ['{p} تألق أمام {opp}… لكن ماذا عن المباريات الكبرى؟', 'يشير ناقدون إلى أن {p} لم يُختبر بعدُ أمام الكبار، وأن مدح الصحافة قد يتحول عبئًا.']]
    },
    uCrit: {
      c: [['{p} يخيّب الآمال أمام {opp}', 'ظهر {p} دون المستوى المنتظر أمام {opp} بتقييم {r} فقط، ما أثار انتقادات واسعة في الصحافة.'],
        ['أداء باهت من {p} وغضب في المدرجات', 'لم يقدّم {p} ما يُرضي الجماهير في مواجهة {opp}، وطالبت أصوات بتعديل دوره في الفريق.'],
        ['أين اختفى {p} أمام {opp}؟', 'غاب {p} عن تأثيره المعتاد أمام {opp}، وتساءل نقّاد عن سبب تراجع مستواه.'],
        ['علامات استفهام حول {p} بعد مواجهة {opp}', 'بتقييم {r} فقط ترك {p} انطباعًا سلبيًا، ويرى محللون أن عليه مراجعة نفسه سريعًا.'],
        ['{p} يتحمّل جزءًا من المسؤولية أمام {opp}', 'خرج {c} بنتيجة {sc} أمام {opp}، وأشارت صحف عدة بأصابع الاتهام إلى أداء {p}.']],
      p: [['لا تحكموا على {p} من مباراة {opp} وحدها', 'يدافع أنصار {p} عنه مؤكدين أن لاعبًا في مثل سنه يحتاج إلى الوقت والثقة، وأن يومًا سيئًا لا يلغي موهبته.'],
        ['الجماهير تساند {p} رغم الأداء أمام {opp}', 'وقفت جماهير {c} خلف لاعبها بعد مباراة {opp} وطالبت المدرب بمنحه فرصة التعويض.'],
        ['{p} يستحق فرصة ثانية بعد مواجهة {opp}', 'مباراة واحدة لا تصنع حكمًا؛ يرى مدافعون عن {p} أن موهبته ستعود سريعًا إلى الواجهة.']],
      n: [['تحليل: أين أخطأ {p} أمام {opp}؟', 'قراءة في أداء {p}: تمركز متأخر وتمريرات غير دقيقة جعلت مساهمته أقل من المتوقع (تقييم {r}).']]
    },
    uRed: {
      c: [['{p} يُطرد ويُدخل {c} في ورطة', 'بطاقة حمراء مباشرة لـ{p} أمام {opp} تركت فريقه بعشرة لاعبين، وتعرّض لانتقادات عنيفة بسبب تهوّره.'],
        ['طرد {p}: تهوّر يدفع ثمنه الفريق', 'تصرّف غير محسوب من {p} كلّف {c} الكثير، ومن المنتظر أن يغيب عن المباراة المقبلة.']],
      p: [['{p} ضحية قرار قاسٍ؟', 'رأى كثيرون أن بطاقة {p} الحمراء أمام {opp} مبالغ فيها وأن الحكم أخطأ التقدير.']],
      n: [['البطاقة الحمراء: ماذا بعد لـ{p}؟', 'يواجه {p} الإيقاف بعد طرده أمام {opp}، وينتظر رد فعل المدرب.']]
    },
    uHat: {
      p: [['{p} يسجّل {g} أهداف أمام {opp}!', 'ليلة لا تُنسى لـ{p} الذي سجّل {g} أهداف في شباك {opp}، وسط احتفال الجماهير واحتفاء الصحافة.'],
        ['هاتريك {p} يُسقط {opp}', 'بتوقيع {p} حسم {c} المباراة بأهداف متتالية أبهرت الجميع.']],
      c: [['هاتريك {p} في مرمى {opp}: صدفة أم بداية الانفجار؟', 'يتساءل محللون هل ستكون ليلة {opp} نقطة تحول في مسيرة {p} أم مجرد صدفة جميلة.']],
      n: [['{p} ينضم إلى نادي الهاتريك بأهدافه في {opp}', 'أضاف {p} إلى رصيده هاتريك جديدًا أمام {opp} ليرتفع صوته في المنافسة.']]
    },
    uTitle: {
      p: [['{p} بطل {x} مع {c}!', 'توّج {p} مع {c} بلقب {x} بعد موسم طويل من العمل والتألق، والصحافة تتغنّى بإسهامه في النجاح.']],
      n: [['حصاد موسم {c}: لقب {x}', 'تتويج {c} باللقب جاء بمساهمة واضحة من {p} وزملائه.']],
      c: [['لقب {x}: هل كان {p} جزءًا حقيقيًا من النجاح؟', 'يرى ناقدون أن إسهام {p} في اللقب يبقى محدودًا مقارنة بنجوم الفريق.']]
    },
    uRel: {
      c: [['هبوط {c}: {p} في دائرة الاتهام', 'تتساءل الصحافة عن مسؤولية اللاعبين، ومنهم {p}، في هبوط {c} هذا الموسم.']],
      n: [['{c} يهبط… وماذا عن {p}؟', 'بعد هبوط {c}، تتجه الأنظار إلى مستقبل {p} بين البقاء والرحيل.']],
      p: [['{p} رغم الهبوط: الوحيد الذي يستحق الاحترام', 'يرى مدافعون عن {p} أنه قدّم كل ما لديه ولم يكن سبب الهبوط.']]
    },
    uSeason: {
      p: [['موسم استثنائي لـ{p}: {k}', 'أنهى {p} الموسم برصيد {k} بتقييم {r}، وسط إشادة واسعة من الصحافة.']],
      n: [['{p} ينهي الموسم: أرقام وحصيلة', 'أنهى {p} موسمه بـ{k} بمتوسط {r}.']],
      c: [['موسم مخيّب لـ{p}: {k}', 'أنهى {p} موسمه دون التوقعات: {k} بمتوسط تقييم {r}، وتتصاعد الأصوات المطالبة بالمزيد.']]
    }
  };

  // ---------- الحالة ----------
  Press.get = () => {
    const S = G.S;
    if (!S.press) S.press = { feed: [], id: 0, seen: 0, snap: {}, cnt: {}, lr: {}, lead: {}, crisis: {}, lastW: -1 };
    return S.press;
  };
  const natName = (c) => (G.Intl ? G.Intl.name(c) : c);
  const clubName = (id) => (C(id) ? C(id).name : '—');
  const stSum = (p) => {
    const lg = p.st.lg || [0, 0, 0, 0, 0], uc = p.st.uc || [0, 0, 0, 0, 0], ap = lg[0] + uc[0];
    return { g: lg[1] + uc[1], a: lg[2] + uc[2], ap, ar: ap ? (lg[3] + uc[3]) / ap : 0 };
  };
  function ctxFor(p, extra) {
    const s = stSum(p), cl = C(p.club), lgId = cl && cl.lg;
    return Object.assign({ p: sur(p), P: p.n, c: clubName(p.club), pos: G.POS_AR[p.pos], nat: natName(p.nat), lg: lgId ? G.leagueName(lgId) : 'الدوري', gt: s.g, at: s.a, ar: s.ar.toFixed(1), age: p.age, ovr: p.ovr }, extra || {});
  }

  // يختار نبرة المقال لصحيفة معيّنة: الأقرب لقيمة الحدث، مع قدر من التعليق المعاكس (نقد بعد مديح والعكس)
  function toneFor(ev, o, key) {
    const kind = T[ev.kind], al = ev.val > 0.2 ? 'p' : ev.val < -0.2 ? 'c' : 'n';
    const base = al === 'n' ? { p: 0.25, c: 0.25, n: 0.5 } : al === 'p' ? { p: 0.55, c: 0.2, n: 0.25 } : { p: 0.2, c: 0.55, n: 0.25 };
    const w = { p: 0, c: 0, n: 0 };
    ['p', 'c', 'n'].forEach((t) => { w[t] = kind[t] && kind[t].length ? base[t] * o.tone[t === 'p' ? 0 : t === 'c' ? 1 : 2] : 0; });
    const sum = w.p + w.c + w.n;
    if (!sum) return al;
    let r = H(key + '|tone') * sum;
    for (const t of ['p', 'c', 'n']) { r -= w[t]; if (r <= 0 && w[t] > 0) return t; }
    return al;
  }
  const GRP = { upset: 'lg', fest: 'lg', leader: 'lg', uPraise: 'user', uCrit: 'user', uRed: 'user', uHat: 'user', uTitle: 'user', uRel: 'user', uSeason: 'user', uclwin: 'ucl', tourwin: 'tour', tourup: 'tour' };
  function outletsFor(ev, n, key) {
    const w = Press.OUTLETS.map((o, i) => ({ i, w: (o.aff[ev.kind] || o.aff[GRP[ev.kind]] || 1) * (0.4 + H(key + '|o' + i)) }));
    w.sort((a, b) => b.w - a.w);
    return w.slice(0, n).map((x) => x.i);
  }

  function push(a) {
    const pr = Press.get();
    a.id = ++pr.id; a.s = G.S.season; a.w = G.S.week;
    pr.feed.unshift(a);
    // حدّان منفصلان: أخبار المستخدم (60) وأخبار العالم (90) كي لا يطغى أحدهما على الآخر
    const cap = (isU, max) => { let n = 0; for (let i = 0; i < pr.feed.length; i++) { if (!!pr.feed[i].u === isU && ++n > max) { pr.feed.splice(i, 1); i--; } } };
    if (pr.feed.length > FEED_MAX) { cap(true, 60); cap(false, FEED_MAX - 60); }
    return a;
  }

  // يكتب مقالات لحدث: n صحف، كل صحيفة بنبرتها وقالبها
  function write(ev, n, tag) {
    const key = tag + '|' + ev.kind + '|' + (ev.pid || ev.cid || '') + '|' + G.S.week, pr = Press.get();
    const recent = {}; pr.feed.slice(0, 90).forEach((a) => { recent[a.h] = true; });
    const outs = outletsFor(ev, n, key), made = [];
    outs.forEach((oi, idx) => {
      const o = Press.OUTLETS[oi], k2 = key + '|' + idx;
      const tone = toneFor(ev, o, k2), list = T[ev.kind][tone];
      let tpl = list[Math.floor(H(k2 + '|t') * list.length) % list.length], hd = fill(tpl[0], ev.ctx);
      for (let j = 1; recent[hd] && j < list.length; j++) { tpl = list[(list.indexOf(tpl) + 1) % list.length]; hd = fill(tpl[0], ev.ctx); }
      if (recent[hd]) return; // نفس العنوان ظهر حديثًا: نتجاوزه بدل التكرار
      recent[hd] = true;
      const lead = pickH(LEADS[o.id][tone], k2 + '|lead');
      const body = (lead ? lead + ' ' : '') + fill(tpl[1], ev.ctx);
      made.push(push({ o: oi, k: ev.kind, t: tone, pid: ev.pid || null, u: ev.user ? 1 : 0, h: hd, b: body, big: ev.big ? 1 : 0 }));
    });
    return made;
  }

  // ---------- الأحداث الأسبوعية لنجوم العالم ----------
  const ATT = { ST: 1, LW: 1, RW: 1, CAM: 1 };
  Press.weekly = (w) => {
    const S = G.S, pr = Press.get();
    if (pr.lastW === S.season * 100 + w) return 0;
    pr.lastW = S.season * 100 + w;
    const prev = pr.snap || {}, next = {}, evs = [];
    Object.keys(S.players).forEach((id) => {
      const p = S.players[id];
      if (p.user || p.ntc || !p.club || p.ovr < 76) return;
      const cl = C(p.club);
      if (!cl || cl.nt) return;
      const lg = p.st.lg || [0, 0, 0, 0, 0], uc = p.st.uc || [0, 0, 0, 0, 0];
      const cur = [lg[1] + uc[1], lg[2] + uc[2], lg[0] + uc[0], Math.round((lg[3] + uc[3]) * 10) / 10];
      next[id] = cur;
      const pv = prev[id];
      if (!pv) return;
      let dg = cur[0] - pv[0], da = cur[1] - pv[1], dap = cur[2] - pv[2], dr = cur[3] - pv[3];
      if (dap < 0) { dg = cur[0]; da = cur[1]; dap = cur[2]; dr = cur[3]; } // موسم جديد: الإحصاءات صُفّرت
      const wr = dap > 0 ? dr / dap : 0, cn = pr.cnt[id] || [0, 0], att = !!ATT[p.pos];
      if (dap > 0) { if (dg > 0) { cn[1]++; cn[0] = 0; } else { cn[0]++; cn[1] = 0; } }
      if (cn[0] || cn[1]) pr.cnt[id] = cn; else delete pr.cnt[id];
      const fame = (p.ovr - 70) / 25, mk = (kind, val, mag, extra, big) => evs.push({ kind, val, mag: mag * (0.6 + fame) + H(w + '|' + id + '|' + kind) * 0.25, pid: id, ctx: ctxFor(p, extra), big });
      if (dg >= 3) mk('hat', 1, 3 + dg, { g: dg }, true);
      else if (dg === 2 && p.ovr >= 80) mk('brace', 0.7, 2);
      if (da >= 3) mk('assist', 0.8, 2.4, { a: da });
      if (dap > 0 && wr >= 8.7 && dg < 2) mk('star', 0.8, 2.1);
      if (dap > 0 && wr <= 5.4 && p.ovr >= 80) mk('stinker', -0.9, 2.6, { x: wr.toFixed(1) });
      if (att && cn[0] >= 6 && p.ovr >= 82) { mk('drought', -0.7, 2.2, { k: cn[0] }); cn[0] = 0; pr.cnt[id] = cn; }
      if (cn[1] >= 5) { mk('streak', 0.9, 2.8); cn[1] = 0; pr.cnt[id] = cn; }
      if (p.inj > 0 && (!pv[4]) && p.ovr >= 82) mk('injury', -0.4, 1.8);
      cur[4] = p.inj > 0 ? 1 : 0;
    });
    pr.snap = next;
    evs.sort((a, b) => b.mag - a.mag);
    let n = 0;
    const per = {}, pick = [];
    evs.forEach((ev) => { const c = per[ev.kind] || 0; if (pick.length < 5 && c < (ev.kind === 'hat' ? 1 : 2)) { per[ev.kind] = c + 1; pick.push(ev); } });
    pick.forEach((ev, i) => { n += write(ev, i < 2 ? 3 : 2, 'wk').length; });
    n += leagueStories(w);
    n += uclStories(w);
    n += specials(w);
    return n;
  };

  // ---------- قصص الدوريات ----------
  const TOP5 = ['ESP1', 'ENG1', 'ITA1', 'GER1', 'FRA1'];
  function leagueStories(w) {
    const S = G.S, pr = Press.get(), userLg = G.World.viewLg(), done = {};
    const lgs = [userLg, TOP5[(w + S.season * 3) % 5], TOP5[(w * 2 + 1) % 5]].filter((l) => { if (done[l]) return false; done[l] = true; return G.LEAGUES[l] && G.LEAGUES[l].tier === 1 || l === userLg; });
    let n = 0;
    lgs.forEach((lg) => {
      const lr = G.World.lastResults(lg);
      if (!lr || !lr.list || !lr.list.length) return;
      if (pr.lr[lg + '|' + S.season] === lr.r) return;
      pr.lr[lg + '|' + S.season] = lr.r;
      const L = G.leagueName(lg), best = { up: null, upM: 0, fest: null, festG: 0 };
      lr.list.forEach((m) => {
        const h = C(m.h), a = C(m.a);
        if (!h || !a) return;
        const dr = (a.rep || 60) - (h.rep || 60);
        if (m.hg < m.ag && (h.rep || 60) - (a.rep || 60) > 6 && ((h.rep || 60) - (a.rep || 60)) > best.upM) { best.up = { c: m.h, opp: m.a, sc: m.hg + '-' + m.ag }; best.upM = (h.rep || 60) - (a.rep || 60); }
        if (m.hg > m.ag && dr > 6 && dr > best.upM) { best.up = { c: m.a, opp: m.h, sc: m.ag + '-' + m.hg, flip: true }; best.upM = dr; }
        if (m.hg + m.ag > best.festG) { best.fest = m; best.festG = m.hg + m.ag; }
      });
      if (best.up) {
        const u = best.up, loser = u.flip ? u.opp : u.c, winner = u.flip ? u.c : u.opp;
        n += write({ kind: 'upset', val: 0, mag: 1, cid: loser, ctx: { c: clubName(loser), opp: clubName(winner), sc: best.up.sc, lg: L } }, 2, 'up' + lg).length;
      } else if (best.fest && best.festG >= 5) {
        const m = best.fest;
        n += write({ kind: 'fest', val: 0.3, mag: 1, cid: m.h, ctx: { c: clubName(m.h), opp: clubName(m.a), sc: m.hg + '-' + m.ag, lg: L } }, 1, 'fe' + lg).length;
      }
      const ord = G.World.sortedOf(lg), top = ord[0];
      if (lr.r >= 8 && top && pr.lead[lg] && pr.lead[lg] !== top) {
        n += write({ kind: 'leader', val: 0.4, mag: 1, cid: top, ctx: { c: clubName(top), opp: clubName(pr.lead[lg]), lg: L, x: G.World.leagueOf(lg).table[top].pts } }, 2, 'ld' + lg).length;
      }
      if (top) pr.lead[lg] = top;
      // أزمات الكبار
      if (lr.r >= 12 && G.LEAGUES[lg].tier === 1) {
        ord.forEach((id, i) => {
          const c = C(id);
          if (!c || (c.rep || 0) < 84 || i < 8) return;
          if (pr.crisis[id] != null && S.season * 100 + w - pr.crisis[id] < 10) return;
          pr.crisis[id] = S.season * 100 + w;
          n += write({ kind: 'crisis', val: -0.9, mag: 2, cid: id, ctx: { c: c.name, lg: L, rank: i + 1, k: lr.r } }, 2, 'cr' + id).length;
        });
      }
    });
    return n;
  }

  // ---------- دوري الأبطال ----------
  function uclStories(w) {
    const S = G.S, u = S.ucl, pr = Press.get();
    if (!u) return 0;
    let n = 0;
    const fx = G.Ucl.fixturesForWeek(w).filter((f) => f.played && C(f.h) && C(f.a));
    if (fx.length) {
      fx.sort((a, b) => ((b.hg + b.ag) + Math.abs(b.hg - b.ag)) - ((a.hg + a.ag) + Math.abs(a.hg - a.ag)));
      const f = fx[0], win = f.hg >= f.ag ? f.h : f.a, los = win === f.h ? f.a : f.h, sc = f.hg >= f.ag ? f.hg + '-' + f.ag : f.ag + '-' + f.hg;
      n += write({ kind: 'ucl', val: 0.3, mag: 1, cid: win, ctx: { c: clubName(win), opp: clubName(los), sc } }, 2, 'uc').length;
    }
    if (u.phase === 'done' && u.winner && pr.uclDone !== S.season) {
      pr.uclDone = S.season;
      const fin = u.final, runner = fin ? (fin.h === u.winner ? fin.a : fin.h) : null;
      n += write({ kind: 'uclwin', val: 1, mag: 5, cid: u.winner, big: true, ctx: { c: clubName(u.winner), opp: runner ? clubName(runner) : '' } }, 3, 'uw').length;
    }
    return n;
  }

  // ---------- أخبار خاصة: شائعات، مواهب، مخضرمون، تحليلات ----------
  function specials(w) {
    const S = G.S;
    const all = Object.keys(S.players).map((k) => S.players[k]).filter((p) => !p.user && !p.ntc && p.club && C(p.club) && !C(p.club).nt);
    let n = 0;
    if (w % 3 === 0) {
      const stars = all.filter((p) => p.ovr >= 83).sort((a, b) => b.ovr - a.ovr);
      if (stars.length) {
        const p = stars[Math.floor(H('rum' + w) * Math.min(stars.length, 24))];
        const big = Object.keys(S.clubs).map((k) => S.clubs[k]).filter((c) => c.lg && c.id !== p.club && (c.rep || 0) >= 84).sort((a, b) => b.rep - a.rep);
        if (big.length) { const dest = pickH(big.slice(0, 8), 'rd' + w + p.id); n += write({ kind: 'rumor', val: 0, mag: 1, pid: p.id, ctx: ctxFor(p, { x: dest.name }) }, 2, 'ru').length; }
      }
    }
    if (w % 5 === 2) {
      const ys = all.filter((p) => p.age <= 21 && p.ovr >= 70).sort((a, b) => (b.ovr + b.pot * 0.3) - (a.ovr + a.pot * 0.3)).slice(0, 12);
      if (ys.length) {
        const p = ys[Math.floor(H('yg' + w) * Math.min(ys.length, 6))];
        n += write({ kind: 'young', val: 0.6, mag: 1, pid: p.id, ctx: ctxFor(p) }, 2, 'yg').length;
        const names = ys.slice(0, 4).map((x) => sur(x) + ' (' + clubName(x.club) + ')').join('، ');
        n += write({ kind: 'young', val: 0, mag: 1, pid: p.id, ctx: ctxFor(p, { x: names }) }, 1, 'yl').length;
      }
    }
    if (w % 8 === 4) {
      const vs = all.filter((p) => p.age >= 34 && p.ovr >= 74).sort((a, b) => b.ovr - a.ovr);
      if (vs.length) { const p = vs[Math.floor(H('vt' + w) * Math.min(vs.length, 6))]; n += write({ kind: 'veteran', val: 0.3, mag: 1, pid: p.id, ctx: ctxFor(p) }, 2, 'vt').length; }
    }
    return n;
  }

  // ---------- مباريات المستخدم ----------
  Press.afterMatch = (sum) => {
    const S = G.S, u = P(S.user), my = sum.userSide;
    if (!(sum.mins > 0)) return 0;
    const gf = my === 'h' ? sum.score.h : sum.score.a, ga = my === 'h' ? sum.score.a : sum.score.h, opp = my === 'h' ? sum.a : sum.h;
    const r = sum.rating || 6.4, k = [];
    if (sum.g) k.push(sum.g + (sum.g === 1 ? ' هدف' : ' أهداف'));
    if (sum.as) k.push(sum.as + (sum.as === 1 ? ' صناعة' : ' صناعات'));
    const ctx = ctxFor(u, { opp: clubName(opp), g: sum.g, a: sum.as, r: r.toFixed(1), k: k.join(' و') || 'أداء مميز', sc: gf + '-' + ga, club: clubName(u.club) });
    ctx.c = ctx.c || clubName(u.club);
    let ev = null, nArt = 1;
    const pr = Press.get(), idx = S.season * 100 + S.week, cd = (pr.ucd = pr.ucd || {});
    const ready = (kind, gap) => cd[kind] == null || idx - cd[kind] >= gap;
    const sig = (r - 6.5) + 1.2 * sum.g + 0.6 * sum.as + (sum.motm ? 0.8 : 0);
    if (sum.red) { ev = { kind: 'uRed', val: -0.8, mag: 3, pid: u.id, user: 1, big: true, ctx }; nArt = 3; }
    else if (sum.g >= 3) { ev = { kind: 'uHat', val: 1, mag: 4, pid: u.id, user: 1, big: true, ctx }; nArt = 3; }
    else if (sum.mins >= 30 && sig >= 3.2 && ready('uPraise', 2)) { ev = { kind: 'uPraise', val: 0.8, mag: 2, pid: u.id, user: 1, ctx }; nArt = 2; }
    else if (sum.mins >= 45 && r <= 5.0 && ready('uCrit', 2)) { ev = { kind: 'uCrit', val: -0.8, mag: 2, pid: u.id, user: 1, big: true, ctx }; nArt = 3; }
    else if (sum.mins >= 30 && sig >= 2.2 && ready('uPraise', 4)) { ev = { kind: 'uPraise', val: 0.4, mag: 1, pid: u.id, user: 1, ctx }; nArt = 1; }
    else if (sum.mins >= 45 && r <= 5.6 && ready('uCrit', 4)) { ev = { kind: 'uCrit', val: -0.4, mag: 1, pid: u.id, user: 1, ctx }; nArt = 1; }
    if (ev) cd[ev.kind] = idx;
    if (!ev) return 0;
    const made = write(ev, nArt, 'um' + sum.fixId);
    if (ev.big && made.length && G.Inbox) { const a = made[0]; G.Inbox.add('news', 'الصحافة: ' + a.h, a.b); }
    return made.length;
  };

  // ---------- نهاية موسم المستخدم ----------
  Press.seasonEnd = (row) => {
    const S = G.S, u = P(S.user);
    const s = row.lg, tot = s.g + row.uc.g, ass = s.a + row.uc.a, apps = s.apps + row.uc.apps;
    if (apps < 5) return 0;
    const avg = apps ? ((s.avg * s.apps + row.uc.avg * row.uc.apps) / apps) : 0, k = tot + ' هدف و' + ass + ' صناعة في ' + apps + ' مباراة';
    const ctx = ctxFor(u, { r: avg.toFixed(2), k, c: clubName(row.club), x: G.leagueName(row.lgId) });
    let n = 0;
    if (row.trophies.liga || row.trophies.d2) n += write({ kind: 'uTitle', val: 1, mag: 4, pid: u.id, user: 1, big: true, ctx: Object.assign({}, ctx, { x: G.leagueName(row.lgId) }) }, 3, 'ut').length;
    if (row.trophies.ucl) n += write({ kind: 'uTitle', val: 1, mag: 5, pid: u.id, user: 1, big: true, ctx: Object.assign({}, ctx, { x: 'دوري أبطال أوروبا' }) }, 3, 'uu').length;
    const def = G.LEAGUES[row.lgId], tab = S.summary && S.summary.table;
    if (def && def.tier === 1 && tab && row.pos > tab.length - def.down) n += write({ kind: 'uRel', val: -1, mag: 4, pid: u.id, user: 1, big: true, ctx }, 3, 'ur').length;
    const good = avg >= 7.2 || tot + ass >= 18, bad = avg < 6.3 && apps >= 15;
    n += write({ kind: 'uSeason', val: good ? 0.8 : bad ? -0.7 : 0, mag: 2, pid: u.id, user: 1, ctx }, 2, 'us').length;
    return n;
  };

  // ---------- الكرة الذهبية ----------
  Press.onBDMonth = (snap) => {
    if (!snap || !snap.list.length) return 0;
    const lead = snap.list[0], sec = snap.list[1], p = P(lead.id);
    let n = 0;
    n += write({ kind: 'bdm', val: 0.6, mag: 2, pid: lead.id, ctx: { p: p ? sur(p) : lead.n, c: lead.club, x: lead.t.toFixed(1) } }, 2, 'bdl' + snap.w).length;
    if (sec) { const q = P(sec.id); n += write({ kind: 'bdm', val: 0, mag: 1, pid: sec.id, ctx: { p: q ? sur(q) : sec.n, c: sec.club, x: (lead.t - sec.t).toFixed(1) } }, 1, 'bds' + snap.w).length; }
    if (snap.list[2] && H('bdc' + snap.w) < 0.6) { const q = P(snap.list[2].id); n += write({ kind: 'bdm', val: -0.6, mag: 1, pid: snap.list[2].id, ctx: { p: q ? sur(q) : snap.list[2].n, c: snap.list[2].club, x: '' } }, 1, 'bdn' + snap.w).length; }
    return n;
  };
  Press.onBD = (rec) => {
    const win = rec.winner, nm = (x) => String(x.n).split(/\s+/).slice(-1)[0];
    let n = write({ kind: 'bdc', val: 0.9, mag: 4, pid: win.id, big: true, user: win.user, ctx: { p: nm(win), c: win.club, y: rec.year } }, 3, 'bw').length;
    const second = rec.top[1];
    if (second) n += write({ kind: 'bdc', val: -0.8, mag: 3, pid: second.id, ctx: { p: nm(second), c: second.club, y: rec.year } }, 2, 'bs').length;
    n += write({ kind: 'bdc', val: 0, mag: 2, pid: win.id, ctx: { p: nm(win), c: win.club, y: rec.year } }, 1, 'bn').length;
    return n;
  };

  // ---------- كأس العالم/آسيا ----------
  Press.onTournament = (I) => {
    const nm = G.Intl.name, lvl = (c) => G.Intl.lvlBase(c);
    const kk = 'البطل ' + nm(I.winner) + (I.boot ? ' · الهدّاف ' + I.boot.n + ' (' + I.boot.g + ')' : '') + (I.mvp ? ' · أفضل لاعب ' + I.mvp.n : '');
    let n = write({ kind: 'tourwin', val: 1, mag: 5, big: true, ctx: { nat: nm(I.winner), x: I.name, k: kk } }, 3, 'tw').length;
    // أبرز المرشّحين الذين خرجوا مبكرًا
    const fav = I.teams.slice().sort((a, b) => lvl(b) - lvl(a)).slice(0, 6).filter((c) => I.res[c] === 'group' || I.res[c] === 'r32' || I.res[c] === 'r16');
    if (fav.length) n += write({ kind: 'tourwin', val: -0.9, mag: 3, ctx: { nat: nm(fav[0]), x: I.name, k: kk } }, 3, 'tf').length;
    // أكبر مفاجأة: فريق أضعف يفوز على أقوى بفارق مستوى
    let up = null, um = 0;
    I.fx.forEach((f) => {
      if (!f.played) return;
      const h = f.h.slice(3), a = f.a.slice(3);
      const w = f.hg > f.ag ? h : f.hg < f.ag ? a : (f.win || null);
      if (!w) return;
      const l = w === h ? a : h, d = lvl(l) - lvl(w);
      if (d > um) { um = d; up = { w, l }; }
    });
    if (up && um >= 8) n += write({ kind: 'tourup', val: 0, mag: 3, ctx: { c: nm(up.l), opp: nm(up.w), x: I.name } }, 3, 'tu').length;
    n += write({ kind: 'tourwin', val: 0, mag: 2, ctx: { nat: nm(I.winner), x: I.name, k: kk } }, 2, 'tn').length;
    return n;
  };

  // ---------- الواجهة: استعلام ----------
  Press.list = (f) => {
    const pr = Press.get();
    let a = pr.feed;
    if (f && f.mine) a = a.filter((x) => x.u);
    if (f && f.tone) a = a.filter((x) => x.t === f.tone);
    if (f && f.outlet != null) a = a.filter((x) => x.o === f.outlet);
    if (f && f.ai) a = a.filter((x) => !x.u);
    return a;
  };
  Press.unread = () => { const pr = Press.get(); return pr.feed.filter((x) => x.id > pr.seen).length; };
  Press.markSeen = () => { const pr = Press.get(); pr.seen = pr.id; };

  G.migrations = G.migrations || [];
  G.migrations.push(() => { const S = G.S; if (S && !S.press) S.press = { feed: [], id: 0, seen: 0, snap: {}, cnt: {}, lr: {}, lead: {}, crisis: {}, lastW: -1 }; });
})(window.G = window.G || {});
