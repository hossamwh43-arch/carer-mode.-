/* data.js — بيانات أولية قابلة للتعديل.
 * تنبيه: أسماء الأندية حقيقية (موسم 2025/26 كمرجع) أما اللاعبون فيُولَّدون خياليًا
 * لأن اللعبة لا تملك تراخيص رسمية لأسماء وتقييمات اللاعبين الحقيقيين. عدّل القوائم أدناه كما تشاء. */
(function (G) {
  'use strict';

  G.CONFIG = {
    startYear: 2025,        // أول موسم = 2025/26
    minAge: 16, maxAge: 21,
    uclSpainSlots: 4,       // عدد مقاعد إسبانيا في دوري الأبطال
    uclForeign: 32,         // أندية أجنبية تكمل الـ36
    ligaWeeks: 38,
    maxSquad: 27, minSquad: 22,
    allowForeignDestination: true, // انتقال اللاعب لنادٍ أجنبي (يلعب الأبطال فقط) مع تحذير
    retireForcedAge: 40,
    saveKey: 'fcc_save_v1', backupKey: 'fcc_save_v1_bak'
  };

  G.POS = ['ST', 'LW', 'RW', 'CAM', 'CM', 'CDM', 'LB', 'RB', 'CB', 'GK'];
  G.POS_AR = { ST: 'مهاجم', LW: 'جناح أيسر', RW: 'جناح أيمن', CAM: 'صانع ألعاب', CM: 'وسط', CDM: 'وسط مدافع', LB: 'ظهير أيسر', RB: 'ظهير أيمن', CB: 'قلب دفاع', GK: 'حارس مرمى' };
  G.POS_GROUP = { ST: 'att', LW: 'att', RW: 'att', CAM: 'mid', CM: 'mid', CDM: 'mid', LB: 'def', RB: 'def', CB: 'def', GK: 'gk' };

  // عدد اللاعبين لكل مركز في الفريق (24 لاعبًا)
  G.SQUAD_TEMPLATE = { GK: 2, CB: 4, LB: 2, RB: 2, CDM: 2, CM: 3, CAM: 2, LW: 2, RW: 2, ST: 3 };

  G.FORMATIONS = {
    '4-3-3':   ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CM', 'LW', 'RW', 'ST'],
    '4-2-3-1': ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CDM', 'CAM', 'LW', 'RW', 'ST'],
    '4-4-2':   ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'LW', 'RW', 'ST', 'ST']
  };

  // [id, الاسم, السمعة, لون1, لون2, خطة]
  G.LALIGA = [
    ['rma', 'Real Madrid', 91, '#f5f5f5', '#1b2a6b', '4-3-3'],
    ['fcb', 'Barcelona', 90, '#a50044', '#004d98', '4-3-3'],
    ['atm', 'Atlético Madrid', 85, '#cb3524', '#272e61', '4-4-2'],
    ['ath', 'Athletic Club', 78, '#ee2523', '#ffffff', '4-2-3-1'],
    ['vil', 'Villarreal', 77, '#fbe122', '#005187', '4-4-2'],
    ['rso', 'Real Sociedad', 77, '#0067b1', '#ffffff', '4-3-3'],
    ['bet', 'Real Betis', 77, '#00954c', '#ffffff', '4-2-3-1'],
    ['sev', 'Sevilla', 75, '#ffffff', '#d4001f', '4-3-3'],
    ['val', 'Valencia', 74, '#ee7203', '#111111', '4-4-2'],
    ['gir', 'Girona', 73, '#cd2534', '#ffffff', '4-2-3-1'],
    ['cel', 'Celta Vigo', 72, '#8ac3ee', '#ffffff', '4-3-3'],
    ['osa', 'Osasuna', 70, '#d91a21', '#0a346f', '4-4-2'],
    ['get', 'Getafe', 69, '#005999', '#ffffff', '4-4-2'],
    ['mal', 'Mallorca', 69, '#e20613', '#111111', '4-4-2'],
    ['ray', 'Rayo Vallecano', 68, '#ffffff', '#e53027', '4-2-3-1'],
    ['ala', 'Alavés', 67, '#0761af', '#ffffff', '4-4-2'],
    ['esp', 'Espanyol', 67, '#007fc8', '#ffffff', '4-4-2'],
    ['elc', 'Elche', 65, '#ffffff', '#00a651', '4-2-3-1'],
    ['lev', 'Levante', 65, '#b4053f', '#004a9f', '4-3-3'],
    ['ovi', 'Real Oviedo', 63, '#1d4fa8', '#ffffff', '4-4-2']
  ]; // 20 ناديًا — يمكن تبديل أي نادٍ من هذه القائمة بسهولة

  // أندية أجنبية تشارك في دوري الأبطال فقط: [id, الاسم, الدولة, السمعة, لون1, لون2, خطة]
  G.FOREIGN = [
    ['mci', 'Manchester City', 'ENG', 90, '#6cabdd', '#ffffff', '4-3-3'],
    ['ars', 'Arsenal', 'ENG', 90, '#ef0107', '#ffffff', '4-3-3'],
    ['liv', 'Liverpool', 'ENG', 89, '#c8102e', '#ffffff', '4-3-3'],
    ['che', 'Chelsea', 'ENG', 85, '#034694', '#ffffff', '4-2-3-1'],
    ['tot', 'Tottenham', 'ENG', 81, '#ffffff', '#132257', '4-3-3'],
    ['new', 'Newcastle', 'ENG', 80, '#111111', '#ffffff', '4-3-3'],
    ['mun', 'Manchester United', 'ENG', 80, '#da291c', '#ffffff', '4-2-3-1'],
    ['avl', 'Aston Villa', 'ENG', 78, '#95bfe5', '#670e36', '4-2-3-1'],
    ['bay', 'Bayern Munich', 'GER', 91, '#dc052d', '#ffffff', '4-2-3-1'],
    ['b04', 'Bayer Leverkusen', 'GER', 84, '#e32221', '#111111', '4-2-3-1'],
    ['bvb', 'Borussia Dortmund', 'GER', 83, '#fde100', '#111111', '4-2-3-1'],
    ['rbl', 'RB Leipzig', 'GER', 80, '#ffffff', '#dd0741', '4-2-3-1'],
    ['sge', 'Eintracht Frankfurt', 'GER', 74, '#e1000f', '#111111', '4-2-3-1'],
    ['int', 'Inter', 'ITA', 87, '#0068a8', '#111111', '4-4-2'],
    ['juv', 'Juventus', 'ITA', 83, '#ffffff', '#111111', '4-3-3'],
    ['nap', 'Napoli', 'ITA', 82, '#12a0d7', '#ffffff', '4-3-3'],
    ['ata', 'Atalanta', 'ITA', 82, '#1e71b8', '#111111', '4-2-3-1'],
    ['mil', 'AC Milan', 'ITA', 81, '#fb090b', '#111111', '4-2-3-1'],
    ['rom', 'Roma', 'ITA', 77, '#8e1f2f', '#f0bc42', '4-3-3'],
    ['psg', 'Paris Saint-Germain', 'FRA', 89, '#004170', '#da291c', '4-3-3'],
    ['mar', 'Marseille', 'FRA', 76, '#2faee0', '#ffffff', '4-3-3'],
    ['mon', 'Monaco', 'FRA', 76, '#e4002b', '#ffffff', '4-2-3-1'],
    ['lyo', 'Lyon', 'FRA', 75, '#ffffff', '#1a3d8f', '4-3-3'],
    ['lil', 'Lille', 'FRA', 74, '#e01e13', '#ffffff', '4-2-3-1'],
    ['spo', 'Sporting CP', 'POR', 81, '#00805a', '#ffffff', '4-3-3'],
    ['ben', 'Benfica', 'POR', 80, '#e30613', '#ffffff', '4-3-3'],
    ['por', 'Porto', 'POR', 78, '#00428c', '#ffffff', '4-3-3'],
    ['bra', 'Braga', 'POR', 72, '#d4001f', '#ffffff', '4-3-3'],
    ['psv', 'PSV Eindhoven', 'NED', 78, '#e2001a', '#ffffff', '4-3-3'],
    ['aja', 'Ajax', 'NED', 75, '#ffffff', '#d2122e', '4-3-3'],
    ['fey', 'Feyenoord', 'NED', 74, '#e2001a', '#ffffff', '4-3-3'],
    ['clb', 'Club Brugge', 'BEL', 73, '#0a5ca8', '#111111', '4-4-2'],
    ['usg', 'Union Saint-Gilloise', 'BEL', 69, '#f9d800', '#1b3f94', '4-3-3'],
    ['gal', 'Galatasaray', 'TUR', 74, '#fdb913', '#a90432', '4-2-3-1'],
    ['fen', 'Fenerbahçe', 'TUR', 73, '#fff200', '#00205b', '4-2-3-1'],
    ['clt', 'Celtic', 'SCO', 69, '#16a34a', '#ffffff', '4-3-3'],
    ['sal', 'RB Salzburg', 'AUT', 69, '#ffffff', '#e4002b', '4-4-2'],
    ['cop', 'FC Copenhagen', 'DEN', 69, '#ffffff', '#00529f', '4-3-3'],
    ['oly', 'Olympiacos', 'GRE', 69, '#e20613', '#ffffff', '4-2-3-1'],
    ['sla', 'Slavia Prague', 'CZE', 68, '#e4002b', '#ffffff', '4-2-3-1'],
    ['sha', 'Shakhtar Donetsk', 'UKR', 67, '#f58220', '#111111', '4-2-3-1'],
    ['bod', 'Bodø/Glimt', 'NOR', 66, '#fdd835', '#111111', '4-3-3'],
    ['yb', 'Young Boys', 'SUI', 65, '#fdd835', '#111111', '4-4-2'],
    ['qar', 'Qarabağ', 'AZE', 64, '#111111', '#ffffff', '4-4-2']
  ];

  // جنسيات اللاعب: [الرمز, العربية, مجموعة الأسماء]
  G.NATS = [
    ['IQ', 'العراق', 'arab'], ['SA', 'السعودية', 'arab'], ['EG', 'مصر', 'arab'], ['MA', 'المغرب', 'arab'],
    ['DZ', 'الجزائر', 'arab'], ['TN', 'تونس', 'arab'], ['JO', 'الأردن', 'arab'], ['SY', 'سوريا', 'arab'],
    ['LB', 'لبنان', 'arab'], ['AE', 'الإمارات', 'arab'], ['TR', 'تركيا', 'arab'],
    ['ES', 'إسبانيا', 'iber'], ['PT', 'البرتغال', 'port'], ['BR', 'البرازيل', 'port'],
    ['AR', 'الأرجنتين', 'latin'], ['UY', 'الأوروغواي', 'latin'], ['CO', 'كولومبيا', 'latin'], ['MX', 'المكسيك', 'latin'],
    ['EN', 'إنجلترا', 'eng'], ['SC', 'اسكتلندا', 'eng'], ['FR', 'فرنسا', 'fra'], ['BE', 'بلجيكا', 'fra'],
    ['DE', 'ألمانيا', 'ger'], ['NL', 'هولندا', 'ger'], ['DK', 'الدنمارك', 'ger'], ['NO', 'النرويج', 'ger'],
    ['IT', 'إيطاليا', 'ita'], ['HR', 'كرواتيا', 'slav'], ['RS', 'صربيا', 'slav'], ['PL', 'بولندا', 'slav'],
    ['NG', 'نيجيريا', 'afr'], ['SN', 'السنغال', 'afr'], ['GH', 'غانا', 'afr'], ['CI', 'ساحل العاج', 'afr'],
    ['JP', 'اليابان', 'asia'], ['KR', 'كوريا الجنوبية', 'asia'], ['US', 'الولايات المتحدة', 'eng'], ['CA', 'كندا', 'eng']
  ];
  G.COUNTRY_GROUP = { ESP: 'iber', ENG: 'eng', GER: 'ger', ITA: 'ita', FRA: 'fra', POR: 'port', NED: 'ger', BEL: 'fra', TUR: 'arab', SCO: 'eng', AUT: 'ger', DEN: 'ger', GRE: 'slav', CZE: 'slav', UKR: 'slav', NOR: 'ger', SUI: 'ger', AZE: 'slav' };

  G.NAMES = {
    iber: { f: ['Alejandro', 'Pablo', 'Sergio', 'Iván', 'Adrián', 'Diego', 'Mario', 'Raúl', 'Álvaro', 'Hugo', 'Unai', 'Jon', 'Marcos', 'Dani'], l: ['García', 'Martín', 'López', 'Sánchez', 'Romero', 'Navarro', 'Ortega', 'Vidal', 'Castro', 'Molina', 'Herrera', 'Iglesias', 'Morales', 'Serrano'] },
    port: { f: ['João', 'Tiago', 'Rafael', 'Gabriel', 'Lucas', 'Mateus', 'Bruno', 'Caio', 'Thiago', 'Rúben', 'Diogo', 'Felipe', 'Vinícius', 'Pedro'], l: ['Silva', 'Santos', 'Costa', 'Oliveira', 'Pereira', 'Almeida', 'Ribeiro', 'Carvalho', 'Moreira', 'Teixeira', 'Barbosa', 'Nunes', 'Cardoso', 'Duarte'] },
    latin: { f: ['Matías', 'Santiago', 'Nicolás', 'Facundo', 'Julián', 'Emiliano', 'Franco', 'Lautaro', 'Agustín', 'Bautista', 'Rodrigo', 'Maximiliano', 'Esteban', 'Gonzalo'], l: ['Fernández', 'Rodríguez', 'Gómez', 'Díaz', 'Acosta', 'Benítez', 'Cabrera', 'Peralta', 'Suárez', 'Núñez', 'Rojas', 'Mendoza', 'Quiroga', 'Paredes'] },
    eng: { f: ['Jack', 'Harry', 'Oliver', 'Callum', 'Jordan', 'Ethan', 'Liam', 'Noah', 'Declan', 'Connor', 'Mason', 'Tyler', 'Reece', 'Owen'], l: ['Walker', 'Hughes', 'Bennett', 'Foster', 'Carter', 'Hayes', 'Fletcher', 'Palmer', 'Reed', 'Barker', 'Wood', 'Bell', 'Sutton', 'Murray'] },
    fra: { f: ['Lucas', 'Hugo', 'Théo', 'Enzo', 'Mathis', 'Nathan', 'Kylian', 'Antoine', 'Rayan', 'Yanis', 'Maxime', 'Axel', 'Louis', 'Tom'], l: ['Dubois', 'Moreau', 'Laurent', 'Girard', 'Bonnet', 'Fontaine', 'Rousseau', 'Mercier', 'Lambert', 'Perrin', 'Garnier', 'Chevalier', 'Blanc', 'Lefèvre'] },
    ger: { f: ['Lukas', 'Felix', 'Jonas', 'Leon', 'Niklas', 'Tim', 'Finn', 'Jan', 'Mats', 'Erik', 'Bas', 'Daan', 'Lars', 'Magnus'], l: ['Müller', 'Schneider', 'Fischer', 'Weber', 'Becker', 'Hoffmann', 'Koch', 'de Vries', 'Bakker', 'Visser', 'Jansen', 'Nilsen', 'Hansen', 'Lindgren'] },
    ita: { f: ['Matteo', 'Federico', 'Lorenzo', 'Andrea', 'Davide', 'Riccardo', 'Alessandro', 'Gianluca', 'Nicolò', 'Simone', 'Luca', 'Marco', 'Stefano', 'Emanuele'], l: ['Rossi', 'Bianchi', 'Conti', 'Ferrari', 'Esposito', 'Greco', 'Ricci', 'Marino', 'Gallo', 'Bruno', 'Moretti', 'De Luca', 'Fabbri', 'Caruso'] },
    slav: { f: ['Luka', 'Marko', 'Nikola', 'Ivan', 'Filip', 'Matej', 'Stefan', 'Dario', 'Milan', 'Jakub', 'Tomas', 'Petr', 'Viktor', 'Andrei'], l: ['Kovač', 'Horvat', 'Petrović', 'Novak', 'Jovanović', 'Marić', 'Kozlov', 'Sokolov', 'Dvořák', 'Nowak', 'Babić', 'Kolarov', 'Stanković', 'Popescu'] },
    afr: { f: ['Moussa', 'Ibrahima', 'Kwame', 'Chidi', 'Emeka', 'Samuel', 'Idrissa', 'Ousmane', 'Kofi', 'Yaya', 'Victor', 'Cheick', 'Mamadou', 'Seko'], l: ['Diallo', 'Traoré', 'Mensah', 'Okafor', 'Sow', 'Keita', 'Coulibaly', 'Adeyemi', 'Konaté', 'Diop', 'Bamba', 'Ndiaye', 'Osei', 'Camara'] },
    arab: { f: ['Ahmed', 'Mohamed', 'Omar', 'Yousef', 'Karim', 'Hamza', 'Ali', 'Mustafa', 'Hassan', 'Ziad', 'Anas', 'Bilal', 'Saif', 'Amir'], l: ['Al-Hassan', 'Benali', 'Haddad', 'Khalil', 'Mansour', 'Nasser', 'Rahman', 'Saleh', 'Youssef', 'Aziz', 'Farouk', 'Habib', 'Idris', 'Jaber'] },
    asia: { f: ['Haruto', 'Ren', 'Sota', 'Min-jun', 'Seo-jun', 'Daichi', 'Takumi', 'Joon', 'Kaito', 'Hyun', 'Yuto', 'Ji-ho', 'Riku', 'Do-yun'], l: ['Tanaka', 'Sato', 'Kim', 'Park', 'Lee', 'Suzuki', 'Takahashi', 'Choi', 'Watanabe', 'Jung', 'Kobayashi', 'Han', 'Yamamoto', 'Seo'] }
  };

  // بيانات الجنسية للاعبي الذكاء الاصطناعي: نسب تقريبية لكل بلد النادي
  G.EXTRA_NATS = ['ES', 'BR', 'AR', 'FR', 'EN', 'DE', 'PT', 'NL', 'IT', 'MA', 'UY', 'CO', 'NG', 'SN', 'HR', 'BE', 'DK', 'JP'];

  // ألوان المظهر
  G.LOOK = {
    skin: ['#f6d5b8', '#e8b98a', '#c68d5e', '#a06a42', '#7a4a2c', '#4e2f1c'],
    hair: ['#111111', '#3b2417', '#6b4423', '#a9743a', '#d9b36b', '#b5472e', '#cccccc'],
    styles: ['قصير', 'مجعّد', 'طويل', 'حليق', 'ذيل', 'مموّه']
  };
})(window.G = window.G || {});
