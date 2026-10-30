/* ui_icons.js — طقم أيقونات موحّد (خطوط SVG) يحلّ محل الإيموجي.
   - UI.ico(name, extraClass) يعيد وسم أيقونة جاهزًا للاستخدام في أي نص HTML.
   - مراقب DOM خفيف يستبدل أي إيموجي معروف يظهر في الصفحة (نصوص اللعبة القديمة) بالأيقونة المقابلة قبل أول رسم،
     فلا يلزم تعديل مئات النصوص؛ وما ليس في الجدول يبقى كما هو. لا يلمس السمات ولا النصوص داخل SVG/خيارات القوائم.
   - زينة فقط: لا علاقة له بحالة اللعبة ولا بالعشوائية. */
(function (G) {
  'use strict';
  const UI = G.UI;

  // رسوم 24×24: خط 1.9 بلا تعبئة افتراضيًا؛ ما يحتاج تعبئة/ألوان ثابتة يحددها بنفسه.
  const D = {
    home: '<path d="M3 11.2 12 4l9 7.2"/><path d="M5.5 9.8v9.7h13V9.8"/><path d="M10 19.5v-5h4v5"/>',
    trophy: '<path d="M7.5 4h9v5.2a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 6H4.2v1.4A3.4 3.4 0 0 0 7.8 11M16.5 6h3.3v1.4a3.4 3.4 0 0 1-3.6 3.6"/><path d="M12 13.8V17M8.6 20h6.8M9.8 17h4.4"/>',
    podium: '<path d="M3.5 20.5V14h5.2v6.5M8.7 20.5V8.5h6.6v12M15.3 20.5V12h5.2v8.5M2.5 20.5h19"/>',
    ucl: '<circle cx="12" cy="12" r="9"/><path d="m12 6.2 1.5 3.3 3.6.4-2.7 2.4.8 3.5L12 14l-3.2 1.8.8-3.5-2.7-2.4 3.6-.4z"/>',
    star: '<path d="m12 3.4 2.6 5.5 6 .8-4.4 4.2 1.1 6L12 17l-5.3 2.9 1.1-6L3.4 9.7l6-.8z"/>',
    ball: '<circle cx="12" cy="12" r="9"/><path d="m12 8.3 3.5 2.5-1.3 4.1H9.8l-1.3-4.1z"/><path d="M12 8.3V3.2M15.5 10.8l4.7-1.5M14.2 14.9l2.9 4M9.8 14.9l-2.9 4M8.5 10.8 3.8 9.3"/>',
    dumbbell: '<path d="M2.8 9.6v4.8M6 7v10M18 7v10M21.2 9.6v4.8M6 12h12"/>',
    swap: '<path d="M4 8.2h14.2l-3.4-3.4M20 15.8H5.8l3.4 3.4"/>',
    refresh: '<path d="M19.6 12a7.6 7.6 0 0 1-13.4 4.9M4.4 12a7.6 7.6 0 0 1 13.4-4.9"/><path d="M18 3.6v3.8h-3.8M6 20.4v-3.8h3.8"/>',
    flag: '<path d="M5.5 21V4"/><path d="M5.5 4.8h13l-2.4 4 2.4 4.2h-13"/>',
    bolt: '<path d="M13.4 2.6 5 13.6h6.2l-.8 7.8 8.6-11.2h-6.2z"/>',
    warn: '<path d="M12 3.4 21.8 20H2.2z"/><path d="M12 9.8v4.6M12 17.4v.1"/>',
    check: '<path d="m4.6 12.6 4.9 4.9 9.9-11"/>',
    x: '<path d="m5.5 5.5 13 13M18.5 5.5l-13 13"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
    clipboard: '<rect x="5" y="4.5" width="14" height="16.5" rx="2.2"/><path d="M9 4.5V3h6v1.5M8.5 10h7M8.5 13.5h7M8.5 17h4"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M8.5 21h7"/>',
    megaphone: '<path d="M4 10v4h3l8.5 4.6V5.4L7 10z"/><path d="M18.8 9a4.2 4.2 0 0 1 0 6"/>',
    cardred: '<rect x="6.5" y="3.5" width="11" height="17" rx="2.2" fill="#ff4d5e" stroke="none"/>',
    cardyellow: '<rect x="6.5" y="3.5" width="11" height="17" rx="2.2" fill="#ffc53d" stroke="none"/>',
    plus: '<path d="M9 3.5h6V9h5.5v6H15v5.5H9V15H3.5V9H9z"/>',
    medal: '<circle cx="12" cy="14.6" r="5.4"/><path d="M8.2 3.5 11.6 10M15.8 3.5 12.4 10M9.4 3.5h5.2"/><path d="m12 12.4.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3z"/>',
    stadium: '<ellipse cx="12" cy="9.5" rx="9" ry="4.2"/><path d="M3 9.5v6.3c0 2.4 4 4.2 9 4.2s9-1.8 9-4.2V9.5"/><path d="M7 13.3v5.2M12 14v5.9M17 13.3v5.2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7"/>',
    trendup: '<path d="m3 17 6-6 4 4 8-8.4"/><path d="M15 6.6h6v6"/>',
    trenddown: '<path d="m3 7 6 6 4-4 8 8.4"/><path d="M15 17.4h6v-6"/>',
    chart: '<path d="M5 20V11M12 20V4M19 20v-7"/>',
    play: '<path d="M7.6 4.8v14.4l11.6-7.2z" fill="currentColor"/>',
    pause: '<path d="M8.2 5.2v13.6M15.8 5.2v13.6" stroke-width="3"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2.4" fill="currentColor"/>',
    ffwd: '<path d="M3.6 6.2v11.6l8-5.8zM12.4 6.2v11.6l8-5.8z" fill="currentColor"/>',
    skip: '<path d="M5.4 5.6v12.8l9-6.4zM18.4 5.4v13.2" />',
    assist: '<circle cx="12" cy="12" r="9"/><path d="m8.4 16.2 3.6-8.6 3.6 8.6M9.7 13.4h4.6"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    arrowup: '<path d="M12 20V5M6 11l6-6 6 6"/>',
    arrowdown: '<path d="M12 4v15M6 13l6 6 6-6"/>',
    trophy2: '<path d="M7.5 4h9v5.2a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 6H4.2v1.4A3.4 3.4 0 0 0 7.8 11M16.5 6h3.3v1.4a3.4 3.4 0 0 1-3.6 3.6"/><path d="M12 13.8V17M8.6 20h6.8"/><path d="M10.2 6.6a1.8 1.5 0 1 1 3.2 1L10.2 10.4h3.6" stroke-width="1.5"/>',
    arrowur: '<path d="M6 18 18 6M8.5 6H18v9.5"/>',
    bench: '<path d="M3.5 12h17v3h-17zM5.5 15v4.5M18.5 15v4.5M6.5 12V7.5h11V12"/>',
    flame: '<path d="M12 21.2c-4 0-6.6-2.7-6.6-6.3 0-3 2-5 3.6-7 .5 1.8 1.4 2.6 2.4 2.9-.3-3.2.9-6.1 3.3-8 .2 3.6 3.9 5.6 3.9 11 0 4-2.6 7.4-6.6 7.4z"/>',
    timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.4v4.3l2.6 1.6M9.5 3h5"/>',
    hourglass: '<path d="M6.8 3.5h10.4M6.8 20.5h10.4M7.8 3.5c0 5.2 8.4 5.2 8.4 8.5s-8.4 3.3-8.4 8.5M16.2 3.5c0 5.2-8.4 5.2-8.4 8.5"/>',
    gamepad: '<rect x="2.5" y="7.3" width="19" height="10.4" rx="5.2"/><path d="M7.5 10.4v4.2M5.4 12.5h4.2M16.2 11.4v.1M18.4 13.6v.1"/>',
    sparkle: '<path d="m11 3.4 1.9 5.6 5.6 1.9-5.6 1.9L11 18.4l-1.9-5.6L3.5 10.9 9.1 9z"/><path d="M19 15.2v4.6M16.7 17.5h4.6"/>',
    save: '<path d="M5 3.5h11l3.5 3.5v13.5H5z"/><path d="M8 3.5v5h7v-5M8 20.5v-6h8v6"/>',
    users: '<circle cx="9" cy="8.2" r="3.2"/><path d="M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6"/><circle cx="17.2" cy="9.2" r="2.5"/><path d="M16.6 14.3c2.9.1 4.9 2.2 4.9 5.2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21c0-4.2 3.4-7 7.5-7s7.5 2.8 7.5 7"/>',
    whistle: '<circle cx="8.6" cy="14.6" r="5"/><path d="m12.4 11.4 8.1-3.2v4.3L16 13.8M8.6 9.6V6.4"/>',
    brain: '<path d="M9.2 4A3 3 0 0 0 6.3 6.6 3.2 3.2 0 0 0 4.4 11a3.2 3.2 0 0 0 1.7 4.8A3 3 0 0 0 9 20a2.9 2.9 0 0 0 3-2.9V6.9A2.9 2.9 0 0 0 9.2 4zM14.8 4a3 3 0 0 1 2.9 2.6A3.2 3.2 0 0 1 19.6 11a3.2 3.2 0 0 1-1.7 4.8A3 3 0 0 1 15 20a2.9 2.9 0 0 1-3-2.9"/>',
    battery: '<rect x="2.5" y="7.3" width="17" height="9.4" rx="2.6"/><path d="M21.6 10.4v3.2M6 10.6v2.8M9.6 10.6v2.8"/>',
    pcard: '<rect x="5.8" y="3" width="12.4" height="18" rx="2.6"/><circle cx="12" cy="9.8" r="2.5"/><path d="M8.6 16.6c.9-1.7 2.1-2.5 3.4-2.5s2.5.8 3.4 2.5"/>',
    sprout: '<path d="M12 21v-9"/><path d="M12 12c0-4-3-6-7-6 0 4 2.5 6 7 6zM12 14.4c0-3 2.2-5 6-5 0 3.5-2.2 5-6 5z"/>',
    news: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.2"/><path d="M7 9h10M7 12.5h10M7 16h6"/>',
    mail: '<rect x="3" y="5.5" width="18" height="13" rx="2.2"/><path d="m3.6 7.2 8.4 6.3 8.4-6.3"/>',
    handshake: '<path d="m3 11.4 3.6-3.1 4.4 1.3 2.4-1.5 4.2 2.4L21 9.2v5.6l-3.4 1.2-3.8 3-3-1.9-3.1 1.1L3.6 15z"/>',
    crown: '<path d="m3.6 18.4-1.2-10.6 5 3.9L12 4l4.6 7.7 5-3.9-1.2 10.6z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3.2 3 3.2 15 0 18M12 3c-3.2 3-3.2 15 0 18"/>',
    rocket: '<path d="M12 2.8c4.1 2 6.1 6 5.1 11l-2.9 2.9H9.8L6.9 13.8c-1-5 1-9 5.1-11z"/><circle cx="12" cy="9.8" r="1.8"/><path d="M8.4 17.2 5 20.6M15.6 17.2l3.4 3.4"/>',
    download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
    book: '<path d="M12 6.2C10 4.7 7 4.2 4 4.2v13.8c3 0 6 .5 8 2 2-1.5 5-2 8-2V4.2c-3 0-6 .5-8 2zM12 6.2V20"/>',
    glove: '<path d="M7.4 20.5v-7L5.2 9.8a1.6 1.6 0 0 1 2.8-1.6l1.1 1.6V5.7a1.5 1.5 0 0 1 3 0V9V4.6a1.5 1.5 0 0 1 3 0V9.6V6.2a1.5 1.5 0 0 1 3 0V14c0 4-2.5 6.5-5.5 6.5z"/>',
    sliders: '<path d="M4 7h9.5M18 7h2M4 17h2.5M11 17h9"/><circle cx="15.7" cy="7" r="2.2"/><circle cx="8.7" cy="17" r="2.2"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    shirt: '<path d="M8.6 4 3 7l2 4.6 2.6-1V20h8.8v-9.4l2.6 1L21 7l-5.6-3c-.5 1.5-1.8 2.5-3.4 2.5S9.1 5.5 8.6 4z"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>',
    eye: '<path d="M2 12s3.7-6.4 10-6.4S22 12 22 12s-3.7 6.4-10 6.4S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    gem: '<path d="M6.2 4h11.6l3.7 5L12 20.8 2.5 9z"/><path d="M2.5 9h19M9.2 4 7.4 9 12 20.8 16.6 9l-1.8-5"/>',
    speaker: '<path d="M4 9.6v4.8h3.6l5 4V5.6l-5 4z"/><path d="M16 9.2a4 4 0 0 1 0 5.6M18.6 6.6a7.6 7.6 0 0 1 0 10.8"/>',
    flask: '<path d="M9.6 3.5h4.8M10.5 3.5v6L5 19a1.5 1.5 0 0 0 1.3 2.2h11.4A1.5 1.5 0 0 0 19 19l-5.5-9.5v-6M7.6 15h8.8"/>',
    trash: '<path d="M4 7h16M9.5 7V4h5v3M6.5 7l1 13.5h9L17.5 7M10 11v6M14 11v6"/>',
    plane: '<path d="M21.5 3.5 3 10.6l7 2.6 2.6 7.2z"/><path d="m10 13.2 11.5-9.7"/>',
    door: '<path d="M6 21V4h11v17M3.5 21h17M13.6 12.5v.1"/>',
    crystal: '<circle cx="12" cy="10.2" r="7"/><path d="M7 20.5h10M8.4 17l-1.3 3.5M15.6 17l1.3 3.5"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    dotg: '<circle cx="12" cy="12" r="5" fill="#35e6a0" stroke="none"/>',
    dotr: '<circle cx="12" cy="12" r="5" fill="#ff5468" stroke="none"/>',
    pen: '<path d="M4 20.2 5 16 16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1"/>',
    bell: '<path d="M6 17.2v-6a6 6 0 0 1 12 0v6l1.6 2H4.4zM10 21.4h4"/>',
    party: '<path d="m4 20 3.4-10 6.6 6.6zM13 5.2l.5-1.8M17 8l1.8-.6M16 4.5v.1M19.6 11.6l1.5.5"/>',
    face: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.6c1-1.2 2.2-1.8 3.5-1.8s2.5.6 3.5 1.8M9 9.6v.1M15 9.6v.1"/>',
    check2: '<circle cx="12" cy="12" r="9"/><path d="m7.8 12.4 3 3 5.6-6.4"/>',
    arrowr: '<path d="M4 12h16M14 6l6 6-6 6"/>',
    arrowl: '<path d="M20 12H4M10 6l-6 6 6 6"/>',
    chevl: '<path d="m15 5-7 7 7 7"/>',
    chevr: '<path d="m9 5 7 7-7 7"/>',
    sock: '<path d="M8 3.5h8v8.8l4 4.4a3 3 0 0 1-2.2 5H11a4 4 0 0 1-3-1.4z"/>',
    pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    web: '<path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/><circle cx="12" cy="12" r="3.6"/><circle cx="12" cy="12" r="8"/>',
    hundred: '<circle cx="12" cy="12" r="9"/><text x="12" y="15.4" text-anchor="middle" font-size="8.6" font-weight="800" fill="currentColor" stroke="none" style="font-family:Num,sans-serif">100</text>',
    ten: '<circle cx="12" cy="12" r="9"/><text x="12" y="16" text-anchor="middle" font-size="11" font-weight="800" fill="currentColor" stroke="none" style="font-family:Num,sans-serif">10</text>',
    crown2: '<path d="m3.6 19-1.2-9.4 5 3.5L12 6.6l4.6 6.5 5-3.5L20.4 19z"/><path d="M12 2.4v1.8M8.8 3.4l.9 1.4M15.2 3.4l-.9 1.4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.2M12 7.8v.1"/>',
    old: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21c0-4.2 3.4-7 7.5-7s7.5 2.8 7.5 7M10 8.6h4"/>'
  };

  // رمز الإيموجي (بلا محدِّد العرض FE0F) ← اسم الأيقونة
  const MAP = {
    '🏠': 'home', '🏆': 'trophy', '🥇': 'trophy', '👑': 'crown', '⭐': 'star', '🌟': 'star', '✨': 'sparkle', '⚽': 'ball', '💪': 'dumbbell', '🏋': 'dumbbell',
    '🔁': 'swap', '🔄': 'refresh', '🏁': 'flag', '⚡': 'bolt', '⚠': 'warn', '🚨': 'warn', '✅': 'check2', '✔': 'check', '✓': 'check', '❌': 'x', '✖': 'x', '⛔': 'ban', '🚫': 'ban',
    '📋': 'clipboard', '📝': 'clipboard', '🗒': 'clipboard', '🎤': 'mic', '🎙': 'mic', '🎧': 'speaker', '📣': 'megaphone', '🔔': 'bell', '🟥': 'cardred', '🟨': 'cardyellow',
    '🩹': 'plus', '🚑': 'plus', '🎖': 'medal', '🏟': 'stadium', '☀': 'sun', '📈': 'trendup', '📉': 'trenddown', '📊': 'chart', '▶': 'play', '🅰': 'assist', '🎯': 'target',
    '⬆': 'arrowup', '⬇': 'arrowdown', '🥈': 'trophy2', '🏅': 'medal', '↗': 'arrowur', '🪑': 'bench', '🔥': 'flame', '⏱': 'timer', '⏳': 'hourglass', '🎮': 'gamepad', '💾': 'save', '👥': 'users', '⏭': 'skip', '🧠': 'brain',
    '🔋': 'battery', '🃏': 'pcard', '🌱': 'sprout', '📰': 'news', '📨': 'mail', '✉': 'mail', '📭': 'mail', '🧑‍🏫': 'whistle', '🤝': 'handshake', '🎩': 'user',
    '🌍': 'globe', '🚀': 'rocket', '📥': 'download', '📤': 'upload', '📘': 'book', '📖': 'book', '🧤': 'glove', '😬': 'face', '😮': 'face', '👌': 'check2', '🎉': 'party',
    '🎚': 'sliders', '⏹': 'stop', '⏸': 'pause', '📅': 'calendar', '🗓': 'calendar', '🟢': 'dotg', '🔴': 'dotr', '🎽': 'shirt', '👕': 'shirt', '💡': 'bulb', '👁': 'eye',
    '🏃': 'bolt', '🕸': 'web', '🔟': 'ten', '💯': 'hundred', '🧓': 'old', '💎': 'gem', '🐐': 'crown2', '🔊': 'speaker', '🧪': 'flask', '🗑': 'trash', '✈': 'plane',
    '🚪': 'door', '🔮': 'crystal', '☰': 'menu', '⏩': 'ffwd', '✍': 'pen', '⚙': 'gear', '🧰': 'gear', 'ℹ': 'info'
  };

  // ---------- الرمز المرجعي (sprite) ----------
  const NS = 'http://www.w3.org/2000/svg';
  function buildSprite() {
    if (document.getElementById('icoSprite')) return;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('id', 'icoSprite'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    let inner = '';
    Object.keys(D).forEach((k) => { inner += '<symbol id="i-' + k + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + D[k] + '</symbol>'; });
    svg.innerHTML = inner;
    document.body.insertBefore(svg, document.body.firstChild);
  }

  UI.ico = (name, cls) => (D[name] ? '<svg class="ic ic-' + name + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-' + name + '"/></svg>' : '');
  UI.icons = Object.keys(D);

  // ---------- مراقب الاستبدال ----------
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keys = Object.keys(MAP).sort((a, b) => b.length - a.length);
  const RX = new RegExp('(?:' + keys.map(esc).join('|') + ')\\uFE0F?', 'gu');
  const PROBE = new RegExp(RX.source, 'u');
  const SKIP = 'svg,option,select,textarea,script,style,title,noscript,[data-noicon]';
  const tpl = {};
  function mk(name) {
    if (!tpl[name]) {
      const s = document.createElementNS(NS, 'svg');
      s.setAttribute('class', 'ic ic-' + name); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
      const u = document.createElementNS(NS, 'use'); u.setAttribute('href', '#i-' + name); s.appendChild(u);
      tpl[name] = s;
    }
    return tpl[name].cloneNode(true);
  }
  function convert(tn) {
    const par = tn.parentElement;
    if (!par || par.closest(SKIP)) return;
    const s = tn.nodeValue;
    if (!PROBE.test(s)) return;
    const frag = document.createDocumentFragment();
    let last = 0, m;
    RX.lastIndex = 0;
    while ((m = RX.exec(s))) {
      const key = m[0].replace(/️$/, '');
      const name = MAP[key];
      if (!name) continue;
      if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
      frag.appendChild(mk(name));
      last = m.index + m[0].length;
    }
    if (last === 0) return;
    if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
    tn.parentNode.replaceChild(frag, tn);
  }
  function walk(node) {
    if (node.nodeType === 3) { convert(node); return; }
    if (node.nodeType !== 1 || !PROBE.test(node.textContent || '')) return;
    if (node.matches && node.matches(SKIP)) return;
    const list = [], tw = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
    let n;
    while ((n = tw.nextNode())) { if (n.nodeValue.length > 1 || n.nodeValue.charCodeAt(0) > 127) list.push(n); }
    list.forEach(convert);
  }
  UI.iconize = (root) => { try { walk(root || document.body); } catch (e) { /* زينة فقط */ } };

  buildSprite();
  UI.iconize(document.body);
  if (typeof MutationObserver === 'function') {
    const obs = new MutationObserver((recs) => {
      try {
        recs.forEach((r) => {
          if (r.type === 'characterData') { walk(r.target); return; }
          r.addedNodes.forEach((n) => walk(n));
        });
      } catch (e) { /* زينة فقط */ }
      obs.takeRecords();
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
})(window.G = window.G || {});
