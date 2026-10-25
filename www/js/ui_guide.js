/* ui_guide.js — مستويات الصعوبة (اختيار عند البداية وتغيير من الإعدادات) والدليل التعريفي القصير للاعب الجديد.
   عرض فقط: الصعوبة تُخزَّن في S.diff وتُطبَّق من G.diff() داخل المحرك؛ الدليل يُعرض مرة واحدة لكل مسيرة جديدة (S.tour). */
(function (G) {
  'use strict';
  const UI = G.UI, esc = UI.esc;

  // ---------- مستوى الصعوبة ----------
  const mult = (v) => '×' + (Math.round(v * 100) / 100).toString().replace(/^0\./, '0.');
  UI.diffPicker = (cur, act) => G.DIFF_ORDER.map((id) => {
    const d = G.DIFF[id];
    return '<button class="dopt ' + (cur === id ? 'on' : '') + '" data-a="' + act + '" data-v="' + id + '" aria-pressed="' + (cur === id ? 'true' : 'false') + '"><span class="dh"><b>' + d.icon + ' ' + esc(d.ar) + '</b>' + (cur === id ? '<span class="pill g">المختار</span>' : '') + '</span>' +
      '<span class="sm mut">' + esc(d.desc) + '</span><span class="dm"><span>الخبرة <b class="ltr">' + mult(d.xp) + '</b></span><span>ثقة المدرب عند الخطأ <b class="ltr">' + mult(d.trustDown) + '</b></span><span>الإصابات <b class="ltr">' + mult(d.inj) + '</b></span><span>العروض <b class="ltr">' + mult(d.offers) + '</b></span></span></button>';
  }).join('');

  UI.on('setDiff', (id) => {
    if (!G.DIFF[id]) return false;
    const cur = G.S.diff || 'normal';
    if (id === cur) return false;
    UI.confirm('تغيير مستوى الصعوبة؟', 'سيصبح المستوى «' + G.DIFF[id].ar + '» ابتداءً من الآن (ما مضى من مسيرتك لا يتغيّر). ' + (G.DIFF_ORDER.indexOf(id) < G.DIFF_ORDER.indexOf(cur) ? 'تخفيض الصعوبة متاح في أي وقت.' : 'رفع الصعوبة يجعل التطور وثقة المدرب أصعب.'), () => {
      G.S.diff = id; G.Save.save(); UI.toast('مستوى الصعوبة: ' + G.DIFF[id].ar); UI.render();
    }, 'تغيير');
    return false;
  });

  UI.diffCard = () => {
    const cur = G.S.diff || 'normal';
    return '<div class="card"><h3>🎚️ مستوى الصعوبة</h3><p class="sm mut">يؤثر على سرعة تطورك وثقة المدرب والإصابات وعروض الانتقال فقط، ولا يغيّر قوة الفرق ولا نتائج المباريات.</p>' + UI.diffPicker(cur, 'setDiff') + '</div>';
  };

  // ---------- الدليل التعريفي ----------
  const PAGES = [
    ['🏠', 'الرئيسية', 'هنا بطاقتك ومباراتك القادمة مع <b>توقّع نتيجتها</b> والتشكيلة المتوقعة. اللعبة أسبوعية: تلعب مباراتك ثم تضغط «إنهاء الأسبوع» فيجري تدريبك وتتقدّم الأيام.'],
    ['🎮', 'المباراة التفاعلية', 'اختر «العب المباراة» لتعيش المباراة دقيقة بدقيقة. تظهر <b>لحظات قرار</b> (تسديد، تمرير، مراوغة…) ونتيجتها تتوقف على سماتك ولياقتك وقرارك. أو اختر «محاكاة كاملة» لنتيجة فورية.'],
    ['💪', 'التدريب والتطور', 'خبرة المباريات والتدريب ترفع مستواك فتنال <b>نقاط تطوير</b> تصرفها على السمات من صفحة التدريب. لكل سمة سقف موسمي وسقف إمكانات. الشدة المكثفة تسرّع التقدّم لكنها ترفع خطر الإصابة.'],
    ['🧑‍🏫', 'ثقة المدرب والدور', 'أداؤك الجيد يرفع <b>ثقة المدرب</b> فتصبح أساسيًا، والتراجع يخفضها. دورك يتحدد بمنافسيك على مركزك. إن قلّت دقائقك فكّر في الإعارة أو في الانتقال.'],
    ['⚡', 'محاكاة الموسم', 'من الرئيسية يمكنك محاكاة أسبوع أو عدة أسابيع أو الموسم كاملًا، مع <b>قواعد توقف</b> (عرض انتقال، إصابة طويلة، مباراة إقصائية، مؤتمر صحفي…) وتقرير مفصّل بعدها.'],
    ['📣', 'الإعلام والانتقالات', 'بعد المباريات قد يُعقد <b>مؤتمر صحفي</b>: الإجابة الجريئة ترفع شعبيتك لكنها قد ترتدّ عليك. الشعبية تجلب المتابعين والرعاة. وفي نوافذ الانتقال تصلك عروض الأندية.'],
    ['💾', 'الحفظ', 'اللعبة تحفظ تلقائيًا بعد كل مباراة وأسبوع. إن انتقلت بين المتصفح وتطبيق الأندرويد فاستخدم «تصدير الحفظ» ثم «استيراد حفظ» من الإعدادات لأن كل منهما يحفظ بياناته منفصلًا.']
  ];
  UI.tourPage = 0;
  function tourHtml() {
    const i = UI.tourPage, p = PAGES[i], last = i === PAGES.length - 1;
    return '<div class="tour"><div class="tour-ic">' + p[0] + '</div><h3 style="text-align:center;margin:6px 0 8px">' + p[1] + '</h3><p class="tour-tx">' + p[2] + '</p>' +
      '<div class="tour-dots">' + PAGES.map((_, k) => '<i class="' + (k === i ? 'on' : '') + '"></i>').join('') + '</div>' +
      '<div class="grid2">' + (last ? '<button class="btn gold" data-a="tourNext">✔ فهمت، لنبدأ</button>' : '<button class="btn pri" data-a="tourNext">التالي ←</button>') +
      (i > 0 ? '<button class="btn" data-a="tourPrev">→ السابق</button>' : '<button class="btn" data-a="tourSkip">تخطّي</button>') + '</div>' +
      (!last && i > 0 ? '<button class="lnk" style="display:block;margin:10px auto 0" data-a="tourSkip">تخطّي الدليل</button>' : '') + '</div>';
  }
  UI.openTour = () => { UI.tourPage = 0; UI.sheetRender(tourHtml); };
  UI.on('tourOpen', () => { UI.closeSheet(); UI.openTour(); return false; });
  UI.on('tourNext', () => { if (UI.tourPage >= PAGES.length - 1) { UI.closeSheet(); return false; } UI.tourPage++; UI.sheetRender(tourHtml); return false; });
  UI.on('tourPrev', () => { UI.tourPage = Math.max(0, UI.tourPage - 1); UI.sheetRender(tourHtml); return false; });
  UI.on('tourSkip', () => { UI.closeSheet(); return false; });

  // يُستدعى من الرئيسية: يعرض الدليل تلقائيًا مرة واحدة فقط لمسيرة جديدة (الحفظ القديم لا يملك الحقل فلا يظهر له)
  UI.autoTour = () => {
    const S = G.S;
    if (!S || S.tour !== 0) return;
    S.tour = 1;
    G.Save.save();
    UI.after = () => UI.openTour();
  };
})(window.G = window.G || {});
