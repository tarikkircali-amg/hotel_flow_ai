# 🏢 MİZ Marketing OS

My İnovatif Zeka'nın tüm projeleri (HotelFlow, DurakAI, ZEKAI Travel, MediTour, FinFlow ve yenileri) için
**AI reklam ajansı**. Ekip çalışır, siz ekranda çizgi film karakterleri olarak izlersiniz, **sadece onaylarsınız**.

## Ekip

| Karakter | Rol | Ne yapar |
|---|---|---|
| 🧑‍💼 Kaan | Ajans Müdürü | Brifi okur, planlar, en sonda kalite kontrol + yönetici özeti |
| 🧭 Selin | Stratejist | Hedef kitle, konumlandırma, mesaj sütunları, kanal önceliği |
| ✍️ Kerem | Metin Yazarı | Başlıklar, reklam metinleri, CTA, slogan |
| 🎨 Pelin | Tasarımcı | Görsel konsept, renkler, **canlı reklam maketi**, görsel üretim komutu |
| 🎬 Ali | Reklam Yönetmeni | 15 sn / 30 sn video storyboard |
| 📱 Tuna | Sosyal Medya Uzmanı | 2 haftalık içerik takvimi |
| 📊 Deniz | Performans Analisti | KPI, UTM, A/B testleri, rapor şablonu |

## Akış

```
Yeni brif → Kaan planlar → Selin → Kerem → Pelin → Ali → Tuna → Deniz → Kaan son kontrol
         → 🟠 Onay kutusu → Siz: ✅ Onayla | 🔁 Revize iste (notla, yeni tur) | ❌ Reddet
         → Onaylanan paket .md olarak indirilir
         → 🎨 Kreatifler: 1:1, 9:16, 16:9 (SVG/PNG)
         → 🚀 Yayın aracına gönder (sizin tıklamanız + teyit) → Zapier/Make/n8n → Meta/Buffer/Google Ads TASLAĞI
```

Ekranda: sıradaki karakter düşünür (…), klavyede yazar, işini bitirince zıplayıp konuşur ve
📄 evrakı bir sonraki masaya fırlatır. Onay beklerken müdür el sallar. Boştaki karakterler kendi kendine konuşur.
Sağ panelde onay kutusu, kampanyalar, projeler ve canlı akış.

## Kurulum (yerel / Windows / Mac)

```bash
cd marketing-os
npm install
npm start            # http://localhost:4000
```

İlk açılışta konsolda **yönetici parolası** yazılır (bir kez). Kendiniz belirlemek için:

```bash
# Mac/Linux
MOS_ADMIN_PASSWORD='güçlü-bir-parola' ANTHROPIC_API_KEY='sk-ant-...' npm start
# Windows PowerShell
$env:MOS_ADMIN_PASSWORD='güçlü-bir-parola'; $env:ANTHROPIC_API_KEY='sk-ant-...'; npm start
```

- `ANTHROPIC_API_KEY` **yoksa → Demo modu**: ofis ve onay akışı çalışır, çıktılar açıkça "DEMO" etiketli şablondur.
- Anahtar **varsa → AI modu**: her karakter Claude ile gerçek içerik üretir (varsayılan model `claude-opus-5`, `MOS_MODEL` ile değişir).
- Tüm ayarlar: `.env.example`.

## Kreatifler

Pelin'in maketinden sunucuda 3 format üretilir: **1:1** (1080×1080), **9:16** (1080×1920), **16:9** (1920×1080).
Kampanya ekranında önizlenir; **SVG** (sunucudan) veya **PNG** (tarayıcıda) indirilir.
Metin rengi arka planla WCAG AA (4,5:1) kontrastı sağlamıyorsa otomatik okunur renge çekilir.

## Yayın köprüsü (Zapier / Make / n8n)

Onaylanan kampanyada **🚀 Yayın aracına gönder (taslak)** düğmesi çıkar. Tıklayıp teyit edince paket
`MOS_PUBLISH_WEBHOOK_URL` adresine JSON olarak gider:

```json
{ "type": "miz.campaign.approved", "publish_as": "draft",
  "campaign": {}, "project": {}, "visual": {},
  "creatives": { "square": { "mime": "image/svg+xml", "svg": "<svg…>" }, "story": {}, "wide": {} },
  "deliverables": [ { "agent": "yazar", "title": "...", "confidence": "high", "body_markdown": "..." } ] }
```

- `MOS_PUBLISH_SECRET` verilirse `X-MOS-Signature: sha256=<HMAC-SHA256(gövde)>` başlığıyla imzalanır; alıcıda doğrulayın.
- Zapier örneği: *Webhooks by Zapier → Catch Hook* → *Buffer: Create Idea* veya Facebook Pages taslak gönderi.
- Hedef araçta **taslak** olarak açın; son "yayınla" yine sizde kalsın.
- Yalnızca **onaylı** kampanya gönderilebilir, aynı kampanya iki kez gönderilemez, her deneme denetime yazılır.
  Hata olursa durum değişmez, ekranda anlaşılır mesaj çıkar.

## Railway / sunucuya kurulum

1. Root directory: `marketing-os`, start komutu: `npm start`.
2. Değişkenler: `MOS_ADMIN_PASSWORD`, `ANTHROPIC_API_KEY`, `MOS_COOKIE_SECURE=1`, isteğe bağlı `MOS_PUBLISH_WEBHOOK_URL` + `MOS_PUBLISH_SECRET`.
3. Kalıcı disk bağlayıp `MOS_DB_FILE=/data/marketing-os.db` verin (yoksa yeniden dağıtımda veriler silinir).
4. Sağlık kontrolü: `/api/health`.

## Kurallar (AI_PRODUCT_OS)

- **İnsan onayı:** hiçbir ajan yayınlayamaz, bütçe harcayamaz, müşteriye gönderemez. Sadece taslak üretir.
- **Dürüstlük:** fiyat, istatistik, müşteri sayısı uydurmaz; eksik bilgiyi `[bilgi gerekli: …]` diye işaretler.
  Her teslimat bir **güven** etiketi taşır (yüksek/orta/düşük). Proje açıklamalarını “Projeler” sekmesinden doldurun.
- **Gizli anahtarlar** yalnızca sunucu ortamında; tarayıcıya hiç gitmez. Oturum HttpOnly çerezde, parola scrypt ile saklanır.
- **Kiracı izolasyonu:** her satırda `organization_id`, her sorgu bunu oturumdan alır.
- **Denetim kaydı:** giriş, proje değişikliği, kampanya oluşturma, onay/revizyon/red, dışa aktarma → `audit` tablosu.
- **Erişilebilirlik:** klavyeyle sekmeler, ekran okuyucu için canlı durum duyurusu, durumlar renk + metinle, hareket azaltma tercihine uyum, açık/koyu tema.

## Test

```bash
npm test   # uçtan uca akış, revizyon, onay kuralları, kiracı izolasyonu, kreatif kontrastı, yayın izinleri + imza
```

## Sonraki adımlar (bilinçli olarak dışarıda bırakıldı)

- Pelin'in `image_prompt`'undan fotoğraf/illüstrasyon üretimi (bir görsel üretim API'si seçilince).
- Yayın sonrası performans verisini geri alıp Deniz'in haftalık raporuna bağlamak.
- Çoklu kullanıcı / rol yönetimi arayüzü, otomatik yedekleme.
