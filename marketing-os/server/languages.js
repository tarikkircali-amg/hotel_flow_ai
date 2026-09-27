// Kampanya dilleri. Ana çalışma dili Türkçe (kurucu onayı için); seçilen her
// hedef dil için Yerelleştirme Uzmanı ayrı bir "transcreation" teslimatı üretir.
const LANGUAGES = [
  { code: 'tr', name: 'Türkçe', native: 'Türkçe', dir: 'ltr' },
  { code: 'en', name: 'İngilizce', native: 'English', dir: 'ltr' },
  { code: 'de', name: 'Almanca', native: 'Deutsch', dir: 'ltr' },
  { code: 'fr', name: 'Fransızca', native: 'Français', dir: 'ltr' },
  { code: 'it', name: 'İtalyanca', native: 'Italiano', dir: 'ltr' },
  { code: 'es', name: 'İspanyolca', native: 'Español', dir: 'ltr' },
  { code: 'ru', name: 'Rusça', native: 'Русский', dir: 'ltr' },
  { code: 'nl', name: 'Hollandaca', native: 'Nederlands', dir: 'ltr' },
  { code: 'pl', name: 'Lehçe', native: 'Polski', dir: 'ltr' },
  { code: 'ar', name: 'Arapça', native: 'العربية', dir: 'rtl' },
  { code: 'fa', name: 'Farsça', native: 'فارسی', dir: 'rtl' },
  { code: 'zh', name: 'Çince (Basitleştirilmiş)', native: '简体中文', dir: 'ltr', cjk: true },
  { code: 'ja', name: 'Japonca', native: '日本語', dir: 'ltr', cjk: true },
  { code: 'ko', name: 'Korece', native: '한국어', dir: 'ltr', cjk: true },
];

const byCode = (code) => LANGUAGES.find((l) => l.code === code);

// Kullanıcı girdisini temizler: bilinen kodlar, tekrarsız, Türkçe her zaman dahil (onay dili).
function parseLanguages(input) {
  const list = Array.isArray(input) ? input : String(input || '').split(',');
  const codes = [...new Set(list.map((c) => String(c).trim().toLowerCase()).filter((c) => byCode(c)))];
  return ['tr', ...codes.filter((c) => c !== 'tr')];
}

module.exports = { LANGUAGES, byCode, parseLanguages };
