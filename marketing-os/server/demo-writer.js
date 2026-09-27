// Demo modu: ANTHROPIC_API_KEY yokken ofisin ve onay akışının denenebilmesi için
// şablon çıktı üretir. Çıktılar açıkça "DEMO" etiketlidir; gerçek içerik değildir.

const { byCode } = require('./languages');

// Demo için elle doğrulanmış örnek ifadeler: "X ile daha akıllı çalış / Yapay zekâ destekli, kurulumu kolay / Ücretsiz dene"
const SAMPLE = {
  en: (n) => [`Work smarter with ${n}`, 'AI-powered and easy to set up.', 'Try it free'],
  de: (n) => [`Arbeite smarter mit ${n}`, 'KI-gestützt und einfach einzurichten.', 'Kostenlos testen'],
  fr: (n) => [`Travaillez plus intelligemment avec ${n}`, 'Propulsé par l’IA, facile à installer.', 'Essai gratuit'],
  it: (n) => [`Lavora in modo più smart con ${n}`, 'Basato sull’IA, facile da configurare.', 'Prova gratis'],
  es: (n) => [`Trabaja de forma más inteligente con ${n}`, 'Con IA y fácil de configurar.', 'Pruébalo gratis'],
  ru: (n) => [`Работайте умнее с ${n}`, 'На базе ИИ, легко настроить.', 'Попробовать бесплатно'],
  nl: (n) => [`Slimmer werken met ${n}`, 'AI-gestuurd en eenvoudig in te stellen.', 'Gratis proberen'],
  pl: (n) => [`Pracuj mądrzej z ${n}`, 'Oparte na AI, łatwe w konfiguracji.', 'Wypróbuj za darmo'],
  ar: (n) => [`اعمل بذكاء أكبر مع ${n}`, 'مدعوم بالذكاء الاصطناعي وسهل الإعداد.', 'جرّبه مجانًا'],
  fa: (n) => [`با ${n} هوشمندانه‌تر کار کنید`, 'مبتنی بر هوش مصنوعی و با راه‌اندازی آسان.', 'رایگان امتحان کنید'],
  zh: (n) => [`用 ${n} 更聪明地工作`, '人工智能驱动，轻松上手。', '免费试用'],
  ja: (n) => [`${n}で、もっとスマートに働こう`, 'AI搭載で、かんたん導入。', '無料で試す'],
  ko: (n) => [`${n}로 더 스마트하게 일하세요`, 'AI 기반, 손쉬운 설정.', '무료로 체험하기'],
};

function localized(code, p) {
  const lang = byCode(code);
  const [headline, subline, cta] = (SAMPLE[code] || SAMPLE.en)(p.name);
  return {
    status_line: `${lang.native} sürümü hazır 🌍`,
    title: `Yerelleştirme — ${lang.name}`,
    body_markdown: `## Başlıklar\n1. ${headline}\n\n## CTA\n- ${cta}\n\n## Kültürel notlar\nDemo modunda yalnızca örnek ifade gösterilir; tam transcreation AI modunda üretilir.`,
    highlights: [lang.native], open_questions: [],
    visual: { headline, subline, cta },
    back_translation: `Başlık: ${p.name} ile daha akıllı çalış · Alt başlık: Yapay zekâ destekli, kurulumu kolay · CTA: Ücretsiz dene`,
  };
}

const NOTE = '> ⚠️ **Demo modu:** Bu içerik şablondan üretildi, AI tarafından yazılmadı. Gerçek çıktı için `ANTHROPIC_API_KEY` tanımlayın.\n\n';

function missing(p) {
  const m = [];
  if (!p.description) m.push('ürün açıklaması');
  if (!p.audience) m.push('hedef kitle');
  if (!p.url) m.push('web adresi');
  return m;
}

const writers = {
  mudur: ({ p, c }) => ({
    status_line: `${p.name} brifini okudum, planı ekibe dağıtıyorum!`,
    title: `Kampanya planı — ${c.title}`,
    body_markdown: `## Amaç\n${c.goal || '[bilgi gerekli: kampanya amacı]'}\n\n## İş planı\n1. Strateji → Selin\n2. Metinler → Kerem\n3. Görsel → Pelin\n4. Video → Ali\n5. Sosyal takvim → Tuna\n6. Ölçüm → Deniz\n7. Son kontrol → Kaan`,
    highlights: ['Brif alındı', `Kanallar: ${c.channels || 'belirtilmedi'}`],
    open_questions: missing(p).map((x) => `[bilgi gerekli: ${x}]`),
  }),
  stratejist: ({ p }) => ({
    status_line: 'Hedef kitleyi üç segmente ayırdım 🎯',
    title: 'Strateji ve konumlandırma',
    body_markdown: `## Hedef kitle\n- ${p.audience || '[bilgi gerekli: hedef kitle]'}\n\n## Konumlandırma\n**${p.name}**, ${p.description || '[ürün açıklaması]'} ihtiyacı olanlar için AI destekli, sade bir çözüm.\n\n## Mesaj sütunları\n1. Zaman kazandırır\n2. Hata payını azaltır\n3. Kolay başlanır`,
    highlights: ['3 mesaj sütunu', 'Kanal önceliği: Instagram, LinkedIn, Google Ads'],
    open_questions: [],
  }),
  yazar: ({ p }) => ({
    status_line: 'Beş başlık yazdım, en sevdiğim üçüncüsü ✍️',
    title: 'Reklam metinleri',
    body_markdown: `## Başlıklar\n1. ${p.name} ile işini akıllandır\n2. Daha az uğraş, daha çok sonuç\n3. Yapay zekâ ekibin artık hazır\n4. Karmaşayı bırak, akışa geç\n5. ${p.name}: bugün dene\n\n## CTA\n- Ücretsiz dene\n- Demo iste\n- Hemen başla`,
    highlights: ['5 başlık', '3 CTA'],
    open_questions: [],
  }),
  tasarimci: ({ p }) => ({
    status_line: 'Maket hazır, renkler kontrast testinden geçti 🎨',
    title: 'Görsel konsept',
    body_markdown: '## Konsept\nSade arka plan, büyük başlık, tek vurgu rengi.\n\n## Formatlar\n- 1:1 feed\n- 9:16 story/reels\n- 16:9 YouTube/web',
    highlights: ['WCAG AA kontrast', '3 format'],
    open_questions: [],
    visual: {
      headline: `${p.name} ile işini akıllandır`, subline: 'Yapay zekâ destekli, kurulumu kolay.',
      cta: 'Ücretsiz dene', bg: '#0f172a', fg: '#ffffff', accent: p.color || '#f59e0b',
      image_prompt: `Clean modern ad visual for "${p.name}", friendly, minimal, soft light`,
    },
  }),
  yonetmen: () => ({
    status_line: 'Kamera! Motor! 15 saniyelik kurgu hazır 🎬',
    title: 'Video storyboard',
    body_markdown: '## 15 sn\n| # | Süre | Görüntü | Metin |\n|---|---|---|---|\n| 1 | 0-3 | Karmaşık masa | "Hâlâ elle mi?" |\n| 2 | 3-10 | Ürün ekranı | "Tek tıkla hazır." |\n| 3 | 10-15 | Logo + CTA | "Ücretsiz dene" |',
    highlights: ['3 sn kanca', 'Sonda CTA'],
    open_questions: [],
  }),
  sosyal: ({ c }) => ({
    status_line: 'İki haftalık takvim hazır, 8 gönderi 📅',
    title: 'İçerik takvimi',
    body_markdown: `Kanallar: ${c.channels || 'Instagram, LinkedIn'}\n\n| Gün | Kanal | Format | Konu |\n|---|---|---|---|\n| Pzt | Instagram | Reels | Problem → çözüm |\n| Çar | LinkedIn | Post | Kurucu hikâyesi |\n| Cum | Instagram | Carousel | 3 ipucu |\n| Pzt | LinkedIn | Video | Demo |`,
    highlights: ['8 gönderi', 'Saatler öneri niteliğinde'],
    open_questions: [],
  }),
  analist: () => ({
    status_line: 'KPI panosu ve UTM şablonu kuruldu 📊',
    title: 'Ölçüm planı',
    body_markdown: '## Kuzey yıldızı\nDemo talebi sayısı — [hedef belirlenmeli]\n\n## UTM\n`?utm_source={kanal}&utm_medium=paid&utm_campaign={kampanya}`\n\n## A/B\n- Başlık 1 vs 3\n- CTA "Dene" vs "Demo iste"',
    highlights: ['1 kuzey yıldızı', '2 A/B testi'],
    open_questions: ['[hedef belirlenmeli]'],
  }),
  'mudur:review': ({ p }) => ({
    status_line: 'Her şey hazır! Onayınızı bekliyoruz 🙌',
    title: 'Yönetici özeti — onaya hazır',
    body_markdown: `## Hazırlananlar\nStrateji, metinler, görsel maket, video senaryosu, içerik takvimi, ölçüm planı.\n\n## Onaydan önce\n${missing(p).map((x) => `- ${x} netleşmeli`).join('\n') || '- Eksik bilgi yok'}\n\n## Risk\nDemo modunda üretildi; yayına almadan önce AI moduyla yeniden üretin.`,
    highlights: ['7 teslimat', 'İnsan onayı bekleniyor'],
    open_questions: [],
  }),
};

function demoOutput(stepId, ctx) {
  const out = stepId.startsWith('lokal:') ? localized(stepId.split(':')[1], ctx.p) : writers[stepId](ctx);
  const low = missing(ctx.p).length >= 2;
  return { ...out, body_markdown: NOTE + out.body_markdown, confidence: low ? 'low' : 'medium' };
}

module.exports = { demoOutput };
