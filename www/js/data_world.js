/* data_world.js — العالم الموسّع: الدوريات الخمسة الكبرى + درجاتها الثانية، مقاعد دوري الأبطال، بيانات الأندية الإضافية.
 * أسماء الأندية حقيقية (موسم 2025/26 كمرجع) والسمعة (rep) تقديرية قابلة للتعديل؛ اللاعبون يُولَّدون خياليين.
 * الأندية الموجودة في G.LALIGA و G.FOREIGN (data.js) تُدمَج هنا دون تكرار. */
(function (G) {
  'use strict';

  // الدوريات: n عدد الأندية، down/up عدد الهابطين/الصاعدين (بلا ملحق)، ucl عدد مقاعد دوري الأبطال
  G.LEAGUES = {
    ESP1: { id: 'ESP1', ar: 'الدوري الإسباني', short: 'لاليغا', country: 'ESP', tier: 1, n: 20, down: 3, ucl: 4, other: 'ESP2' },
    ENG1: { id: 'ENG1', ar: 'الدوري الإنجليزي الممتاز', short: 'البريميرليغ', country: 'ENG', tier: 1, n: 20, down: 3, ucl: 5, other: 'ENG2' },
    ITA1: { id: 'ITA1', ar: 'الدوري الإيطالي', short: 'سيري آ', country: 'ITA', tier: 1, n: 20, down: 3, ucl: 4, other: 'ITA2' },
    GER1: { id: 'GER1', ar: 'الدوري الألماني', short: 'البوندسليغا', country: 'GER', tier: 1, n: 18, down: 3, ucl: 4, other: 'GER2' },
    FRA1: { id: 'FRA1', ar: 'الدوري الفرنسي', short: 'ليغ 1', country: 'FRA', tier: 1, n: 18, down: 3, ucl: 3, other: 'FRA2' },
    ESP2: { id: 'ESP2', ar: 'الدرجة الثانية الإسبانية', short: 'سيغوندا', country: 'ESP', tier: 2, n: 20, up: 3, other: 'ESP1' },
    ENG2: { id: 'ENG2', ar: 'التشامبيونشيب الإنجليزي', short: 'التشامبيونشيب', country: 'ENG', tier: 2, n: 20, up: 3, other: 'ENG1' },
    ITA2: { id: 'ITA2', ar: 'الدرجة الثانية الإيطالية', short: 'سيري بي', country: 'ITA', tier: 2, n: 20, up: 3, other: 'ITA1' },
    GER2: { id: 'GER2', ar: 'الدرجة الثانية الألمانية', short: 'بوندسليغا 2', country: 'GER', tier: 2, n: 18, up: 3, other: 'GER1' },
    FRA2: { id: 'FRA2', ar: 'الدرجة الثانية الفرنسية', short: 'ليغ 2', country: 'FRA', tier: 2, n: 18, up: 3, other: 'FRA1' }
  };
  G.LEAGUE_ORDER = ['ESP1', 'ENG1', 'ITA1', 'GER1', 'FRA1', 'ESP2', 'ENG2', 'ITA2', 'GER2', 'FRA2'];
  // مقاعد دوري الأبطال لكل دوري كبير (المجموع 20) + 16 نادٍ من خارج الدوريات الخمسة
  G.UCL_SLOTS = { ENG1: 5, ESP1: 4, ITA1: 4, GER1: 4, FRA1: 3 };
  G.LG_TOP_OF = { ESP: 'ESP1', ENG: 'ENG1', ITA: 'ITA1', GER: 'GER1', FRA: 'FRA1' };
  G.COUNTRY_AR = { ESP: 'إسبانيا', ENG: 'إنجلترا', ITA: 'إيطاليا', GER: 'ألمانيا', FRA: 'فرنسا', POR: 'البرتغال', NED: 'هولندا', BEL: 'بلجيكا', TUR: 'تركيا', SCO: 'اسكتلندا', AUT: 'النمسا', DEN: 'الدنمارك', GRE: 'اليونان', CZE: 'التشيك', UKR: 'أوكرانيا', NOR: 'النرويج', SUI: 'سويسرا', AZE: 'أذربيجان' };
  // رمز الجنسية لأبناء بلد النادي (لا يُشتق من أول حرفين)
  G.COUNTRY_NAT = { ESP: 'ES', ENG: 'EN', ITA: 'IT', GER: 'DE', FRA: 'FR', POR: 'PT', NED: 'NL', BEL: 'BE', TUR: 'TR', SCO: 'SC', AUT: 'AT', DEN: 'DK', GRE: 'GR', CZE: 'CZ', UKR: 'UA', NOR: 'NO', SUI: 'CH', AZE: 'AZ' };

  // أندية إضافية: [id, الاسم, الدوري, السمعة, لون1, لون2, خطة]
  const A = '4-3-3', B = '4-2-3-1', D = '4-4-2';
  G.WORLD_EXTRA = [
    // ——— الدوري الإنجليزي الممتاز ———
    ['bou', 'Bournemouth', 'ENG1', 76, '#da291c', '#111111', B], ['bre', 'Brentford', 'ENG1', 76, '#e30613', '#ffffff', D],
    ['bri', 'Brighton', 'ENG1', 77, '#0057b8', '#ffffff', B], ['bnl', 'Burnley', 'ENG1', 68, '#6c1d45', '#99d6ea', D],
    ['cry', 'Crystal Palace', 'ENG1', 77, '#1b458f', '#c4122e', B], ['eve', 'Everton', 'ENG1', 76, '#003399', '#ffffff', D],
    ['ful', 'Fulham', 'ENG1', 75, '#ffffff', '#111111', B], ['lee', 'Leeds United', 'ENG1', 71, '#ffffff', '#1d428a', B],
    ['nfo', 'Nottingham Forest', 'ENG1', 75, '#dd0000', '#ffffff', D], ['sun', 'Sunderland', 'ENG1', 67, '#eb172b', '#ffffff', B],
    ['whu', 'West Ham', 'ENG1', 75, '#7a263a', '#1bb1e7', B], ['wol', 'Wolves', 'ENG1', 71, '#fdb913', '#111111', D],
    // ——— التشامبيونشيب ———
    ['sou', 'Southampton', 'ENG2', 67, '#d71920', '#ffffff', A], ['lei', 'Leicester City', 'ENG2', 67, '#003090', '#ffffff', B],
    ['ips', 'Ipswich Town', 'ENG2', 66, '#0044aa', '#ffffff', D], ['cov', 'Coventry City', 'ENG2', 63, '#59b9e8', '#ffffff', B],
    ['mid', 'Middlesbrough', 'ENG2', 63, '#e2001a', '#ffffff', B], ['wba', 'West Bromwich Albion', 'ENG2', 62, '#122f67', '#ffffff', D],
    ['nor', 'Norwich City', 'ENG2', 63, '#00a650', '#fff200', B], ['shu', 'Sheffield United', 'ENG2', 62, '#ee2737', '#ffffff', D],
    ['wat', 'Watford', 'ENG2', 62, '#fbee23', '#ed2127', B], ['sto', 'Stoke City', 'ENG2', 61, '#e03a3e', '#ffffff', D],
    ['swa', 'Swansea City', 'ENG2', 61, '#ffffff', '#111111', A], ['hul', 'Hull City', 'ENG2', 60, '#f5a12d', '#111111', D],
    ['bbn', 'Blackburn Rovers', 'ENG2', 60, '#009fe3', '#ffffff', D], ['brc', 'Bristol City', 'ENG2', 60, '#e21a22', '#ffffff', B],
    ['der', 'Derby County', 'ENG2', 60, '#ffffff', '#111111', D], ['bir', 'Birmingham City', 'ENG2', 61, '#0000ff', '#ffffff', B],
    ['qpr', 'Queens Park Rangers', 'ENG2', 59, '#1d5ba4', '#ffffff', D], ['pmt', 'Portsmouth', 'ENG2', 59, '#001489', '#ffffff', D],
    ['mlw', 'Millwall', 'ENG2', 58, '#001d5e', '#ffffff', D], ['pre', 'Preston North End', 'ENG2', 58, '#ffffff', '#1b2a6b', D],
    // ——— الدرجة الثانية الإسبانية ———
    ['alm', 'Almería', 'ESP2', 59, '#e2001a', '#ffffff', B], ['cad', 'Cádiz', 'ESP2', 58, '#ffd400', '#0b3d91', D],
    ['gra', 'Granada', 'ESP2', 60, '#c8102e', '#ffffff', D], ['lpa', 'Las Palmas', 'ESP2', 61, '#ffd100', '#005baa', A],
    ['leg', 'Leganés', 'ESP2', 60, '#00873e', '#ffffff', D], ['vld', 'Real Valladolid', 'ESP2', 60, '#5b2a86', '#ffffff', D],
    ['rac', 'Racing Santander', 'ESP2', 57, '#00a651', '#ffffff', B], ['dep', 'Deportivo La Coruña', 'ESP2', 58, '#0057b8', '#ffffff', B],
    ['mlg', 'Málaga', 'ESP2', 58, '#00aeef', '#ffffff', B], ['zar', 'Real Zaragoza', 'ESP2', 57, '#ffffff', '#003087', D],
    ['gij', 'Sporting Gijón', 'ESP2', 57, '#e2001a', '#ffffff', B], ['eib', 'Eibar', 'ESP2', 57, '#7a1f3d', '#00539f', D],
    ['brg', 'Burgos', 'ESP2', 55, '#ffffff', '#111111', D], ['cas', 'Castellón', 'ESP2', 56, '#111111', '#ffffff', B],
    ['alb', 'Albacete', 'ESP2', 55, '#ffffff', '#111111', D], ['cor', 'Córdoba', 'ESP2', 55, '#00a651', '#ffffff', D],
    ['hue', 'Huesca', 'ESP2', 55, '#0047ab', '#c8102e', D], ['mir', 'Mirandés', 'ESP2', 53, '#e2001a', '#111111', D],
    ['cul', 'Cultural Leonesa', 'ESP2', 52, '#ffffff', '#e2001a', D], ['and', 'Andorra', 'ESP2', 52, '#0b3d91', '#ffd100', D],
    // ——— الدوري الإيطالي ———
    ['bol', 'Bologna', 'ITA1', 76, '#1a2f5a', '#c8102e', B], ['cag', 'Cagliari', 'ITA1', 66, '#c8102e', '#0b3d91', D],
    ['com', 'Como', 'ITA1', 69, '#0b4aa2', '#ffffff', B], ['cre', 'Cremonese', 'ITA1', 63, '#c8102e', '#7a7a7a', D],
    ['fio', 'Fiorentina', 'ITA1', 77, '#5b2a86', '#ffffff', B], ['gen', 'Genoa', 'ITA1', 70, '#c8102e', '#0b3d91', D],
    ['ver', 'Hellas Verona', 'ITA1', 66, '#ffd100', '#0b3d91', D], ['laz', 'Lazio', 'ITA1', 78, '#87ceeb', '#ffffff', A],
    ['lec', 'Lecce', 'ITA1', 65, '#ffd100', '#c8102e', D], ['par', 'Parma', 'ITA1', 68, '#ffffff', '#ffd100', B],
    ['pis', 'Pisa', 'ITA1', 63, '#111111', '#1e90ff', D], ['sas', 'Sassuolo', 'ITA1', 67, '#00a550', '#111111', B],
    ['tor', 'Torino', 'ITA1', 70, '#7a1a3a', '#ffffff', D], ['udi', 'Udinese', 'ITA1', 68, '#ffffff', '#111111', D],
    // ——— سيري بي ———
    ['ven', 'Venezia', 'ITA2', 61, '#f26522', '#00a550', B], ['mnz', 'Monza', 'ITA2', 62, '#c8102e', '#ffffff', B],
    ['pal', 'Palermo', 'ITA2', 62, '#f4a6c0', '#111111', A], ['emp', 'Empoli', 'ITA2', 61, '#0057b8', '#ffffff', D],
    ['sam', 'Sampdoria', 'ITA2', 61, '#0057b8', '#ffffff', D], ['spe', 'Spezia', 'ITA2', 58, '#ffffff', '#111111', D],
    ['bar', 'Bari', 'ITA2', 59, '#ffffff', '#c8102e', D], ['ces', 'Cesena', 'ITA2', 55, '#ffffff', '#111111', D],
    ['cat', 'Catanzaro', 'ITA2', 56, '#ffd100', '#c8102e', B], ['mod', 'Modena', 'ITA2', 56, '#ffd100', '#0b3d91', D],
    ['pad', 'Padova', 'ITA2', 54, '#ffffff', '#c8102e', D], ['pes', 'Pescara', 'ITA2', 54, '#87ceeb', '#ffffff', D],
    ['fro', 'Frosinone', 'ITA2', 57, '#ffd100', '#0b3d91', D], ['car', 'Carrarese', 'ITA2', 52, '#ffd100', '#0b3d91', D],
    ['jst', 'Juve Stabia', 'ITA2', 52, '#ffd100', '#0b3d91', D], ['man', 'Mantova', 'ITA2', 52, '#c8102e', '#ffffff', D],
    ['reg', 'Reggiana', 'ITA2', 53, '#7a1a3a', '#ffffff', D], ['sud', 'Südtirol', 'ITA2', 53, '#ffffff', '#c8102e', D],
    ['ave', 'Avellino', 'ITA2', 54, '#006b3f', '#ffffff', D], ['ent', 'Virtus Entella', 'ITA2', 51, '#ffffff', '#0b3d91', D],
    // ——— الدوري الألماني ———
    ['aug', 'Augsburg', 'GER1', 68, '#c8102e', '#006b3f', D], ['uni', 'Union Berlin', 'GER1', 70, '#e2001a', '#ffffff', D],
    ['bmg', 'Borussia Mönchengladbach', 'GER1', 71, '#ffffff', '#006b3f', B], ['fre', 'Freiburg', 'GER1', 73, '#c8102e', '#111111', B],
    ['ham', 'Hamburg', 'GER1', 66, '#0057b8', '#ffffff', B], ['hei', 'Heidenheim', 'GER1', 65, '#c8102e', '#0b3d91', D],
    ['hof', 'Hoffenheim', 'GER1', 70, '#0057b8', '#ffffff', B], ['kol', 'Köln', 'GER1', 66, '#ffffff', '#e2001a', B],
    ['mai', 'Mainz', 'GER1', 69, '#c8102e', '#ffffff', D], ['stp', 'St. Pauli', 'GER1', 65, '#6b3a1f', '#ffffff', D],
    ['stu', 'Stuttgart', 'GER1', 76, '#ffffff', '#c8102e', B], ['wer', 'Werder Bremen', 'GER1', 68, '#00a550', '#ffffff', B],
    ['wob', 'Wolfsburg', 'GER1', 70, '#6aa84f', '#ffffff', B],
    // ——— البوندسليغا 2 ———
    ['sch', 'Schalke 04', 'GER2', 64, '#004d9d', '#ffffff', D], ['her', 'Hertha BSC', 'GER2', 63, '#005ca9', '#ffffff', B],
    ['han', 'Hannover 96', 'GER2', 60, '#006b3f', '#111111', D], ['dus', 'Fortuna Düsseldorf', 'GER2', 61, '#e2001a', '#ffffff', B],
    ['ksc', 'Karlsruher SC', 'GER2', 58, '#0057b8', '#ffffff', D], ['fck', 'Kaiserslautern', 'GER2', 60, '#c8102e', '#ffffff', D],
    ['nur', 'Nürnberg', 'GER2', 59, '#a50034', '#111111', D], ['fue', 'Greuther Fürth', 'GER2', 57, '#006b3f', '#ffffff', D],
    ['dar', 'Darmstadt 98', 'GER2', 58, '#0057b8', '#ffffff', D], ['pdb', 'Paderborn', 'GER2', 58, '#0057b8', '#111111', D],
    ['mag', 'Magdeburg', 'GER2', 55, '#0057b8', '#ffffff', D], ['brs', 'Braunschweig', 'GER2', 55, '#ffd100', '#0b3d91', D],
    ['elv', 'Elversberg', 'GER2', 54, '#ffffff', '#111111', B], ['mue', 'Preußen Münster', 'GER2', 53, '#006b3f', '#111111', D],
    ['kie', 'Holstein Kiel', 'GER2', 57, '#0057b8', '#c8102e', D], ['bie', 'Arminia Bielefeld', 'GER2', 57, '#0057b8', '#111111', D],
    ['dre', 'Dynamo Dresden', 'GER2', 56, '#ffd100', '#111111', D], ['boc', 'VfL Bochum', 'GER2', 58, '#0057b8', '#ffffff', D],
    // ——— الدوري الفرنسي ———
    ['ang', 'Angers', 'FRA1', 62, '#111111', '#ffffff', D], ['aux', 'Auxerre', 'FRA1', 63, '#0057b8', '#ffffff', D],
    ['brt', 'Brest', 'FRA1', 66, '#e2001a', '#ffffff', B], ['leh', 'Le Havre', 'FRA1', 61, '#0057b8', '#87ceeb', D],
    ['len', 'Lens', 'FRA1', 72, '#ffd100', '#c8102e', B], ['lor', 'Lorient', 'FRA1', 61, '#f26522', '#111111', D],
    ['met', 'Metz', 'FRA1', 61, '#7a1a3a', '#ffffff', D], ['nan', 'Nantes', 'FRA1', 65, '#ffd100', '#006b3f', D],
    ['nic', 'Nice', 'FRA1', 72, '#c8102e', '#111111', B], ['pfc', 'Paris FC', 'FRA1', 64, '#0b3d91', '#ffffff', B],
    ['ren', 'Rennes', 'FRA1', 72, '#e2001a', '#111111', B], ['str', 'Strasbourg', 'FRA1', 69, '#0057b8', '#ffffff', B],
    ['tou', 'Toulouse', 'FRA1', 66, '#7a1a9a', '#ffffff', B],
    // ——— ليغ 2 ———
    ['ste', 'Saint-Étienne', 'FRA2', 62, '#006b3f', '#ffffff', B], ['mtp', 'Montpellier', 'FRA2', 60, '#0b3d91', '#f26522', B],
    ['rei', 'Reims', 'FRA2', 62, '#e2001a', '#ffffff', B], ['tro', 'Troyes', 'FRA2', 56, '#0057b8', '#ffffff', D],
    ['gui', 'Guingamp', 'FRA2', 56, '#c8102e', '#111111', D], ['rod', 'Rodez', 'FRA2', 52, '#ffd100', '#c8102e', D],
    ['red', 'Red Star', 'FRA2', 52, '#00a550', '#ffffff', D], ['ann', 'Annecy', 'FRA2', 52, '#c8102e', '#ffffff', D],
    ['dun', 'Dunkerque', 'FRA2', 52, '#0057b8', '#c8102e', D], ['grn', 'Grenoble', 'FRA2', 52, '#0057b8', '#ffffff', D],
    ['lav', 'Laval', 'FRA2', 52, '#f26522', '#111111', D], ['cle', 'Clermont', 'FRA2', 55, '#c8102e', '#0b3d91', D],
    ['pau', 'Pau', 'FRA2', 51, '#ffd100', '#006b3f', D], ['ami', 'Amiens', 'FRA2', 54, '#ffffff', '#111111', D],
    ['bas', 'Bastia', 'FRA2', 55, '#0057b8', '#ffffff', D], ['nay', 'Nancy', 'FRA2', 53, '#ffffff', '#c8102e', D],
    ['lmn', 'Le Mans', 'FRA2', 52, '#ffd100', '#c8102e', D], ['cae', 'Caen', 'FRA2', 53, '#0057b8', '#c8102e', D]
  ];

  // قائمة موحّدة بكل أندية العالم: { id, name, country, lg, rep, c:[لون1، لون2], form }
  // lg = null للأندية التي تلعب دوري الأبطال فقط (لا دوري محلي لها في اللعبة)
  G.worldClubs = () => {
    const out = [];
    G.LALIGA.forEach((d) => out.push({ id: d[0], name: d[1], country: 'ESP', lg: 'ESP1', rep: d[2], c: [d[3], d[4]], form: d[5] }));
    G.FOREIGN.forEach((d) => out.push({ id: d[0], name: d[1], country: d[2], lg: G.LG_TOP_OF[d[2]] || null, rep: d[3], c: [d[4], d[5]], form: d[6] }));
    G.WORLD_EXTRA.forEach((d) => out.push({ id: d[0], name: d[1], country: G.LEAGUES[d[2]].country, lg: d[2], rep: d[3], c: [d[4], d[5]], form: d[6] }));
    return out;
  };
  G.leagueName = (lg) => (G.LEAGUES[lg] ? G.LEAGUES[lg].ar : 'دوري');
  // اسم مختصر يتسع لشريط العنوان
  G.leagueTitle = (lg) => { const d = G.LEAGUES[lg]; return d ? (d.tier === 1 ? d.ar.replace(' الممتاز', '') : d.short) : 'الدوري'; };
})(window.G = window.G || {});
