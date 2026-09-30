# Deniz Dent — 7/24 Sesli Klinik Asistanı

Klinik kapalıyken gelen telefon çağrılarını karşılayan yapay zekâ asistanı.
Twilio ConversationRelay + Claude üzerine kurulu.

**Durum:** çalışır iskelet. Gerçek bir telefon çağrısıyla henüz test edilmedi
(bkz. [Türkçe ses doğrulaması](#türkçe-ses-doğrulaması-i̇lk-i̇ş)).

---

## Ne yapar, ne yapmaz

**Yapar**
- Gelen çağrıyı karşılar, kendini dijital asistan olarak tanıtır
- Kliniğin onayladığı bilgileri verir (adres, saatler, hizmetler, SSS)
- **Onaylı fiyat bandını** söyler — onaysız işlemde rakam söylemez
- Randevu talebini alır, tarih/saat/telefonu **geri okuyarak** teyit eder
- Acil ifadelerde bilgi vermeye çalışmaz, doğrudan yönlendirir
- Hasta yetkiliyle konuşmak isterse insana aktarır
- Gece olan biteni sabah teslim ekranına yazar

**Yapmaz — bilerek**
- Teşhis koymaz, tedavi önermez
- Onaylanmamış fiyat söylemez, pazarlık yapmaz, indirim vermez
- Randevuyu kesinleştirmez — talep alır, **insan onaylar**
- Triyaj yapmaz (acil durumda yönlendirir, değerlendirme yapmaz)
- Ses kaydı tutmaz — sadece yazılı döküm

---

## Mimari

```
Çağrı → Twilio → POST /twilio/gelen-cagri → TwiML <ConversationRelay>
                                                    ↓
                          wss://.../relay ← → src/twilio.js
                                                    ↓
                         ┌──────── ACİL TARAMA (src/acil.js) ────────┐
                         │  LLM'e GİTMEDEN önce çalışır              │
                         │  eşleşirse → doğrudan yönlendirme         │
                         └───────────────────┬───────────────────────┘
                                             ↓ (acil değilse)
                                      src/ajan.js  (Claude)
                                             ↓
                    araçlar: fiyat_bandi_sorgula · randevu_talebi_olustur
                             · insana_aktar          (src/araclar.js)
                                             ↓
                                   PostgreSQL (db/schema.sql)
                                             ↓
                            /panel  →  sabah teslim ekranı
```

**Acil taramanın LLM'den önce çalışması bilinçli bir karardır.** Acil bir çağrıda
modelin "düşünmesini" bekleyemeyiz ve doğru davranacağına güvenemeyiz. Yanlış
pozitif (acil olmayana acil demek) kabul edilebilir; yanlış negatif değildir.

| Dosya | Sorumluluk |
|---|---|
| `src/config.js` | Tüm ayarlar tek yerden; eksik ayarda sunucu **açılmaz** |
| `src/klinik.js` | Mesai hesabı, fiyat bandı, tarih — saf fonksiyonlar |
| `src/acil.js` | Acil kelime taraması |
| `src/araclar.js` | Claude'un çağırabildiği araçlar |
| `src/ajan.js` | Konuşma hafızası + Claude akış döngüsü + sistem metni |
| `src/twilio.js` | TwiML, imza doğrulama, WebSocket relay, aktarım |
| `src/ses-yazici.js` | Token akışı (`last` bayrağı yönetimi) |
| `src/panel.js` | Sabah teslim API'si + oturum güvenliği |
| `src/db.js` | PostgreSQL erişimi ve denetim kaydı |

---

## Kurulum

### 1. Gereksinimler
- Node.js 20+
- PostgreSQL 14+ (Railway veya Supabase tek tıkla verir)
- Twilio hesabı + Türkiye numarası
- Anthropic API anahtarı

### 2. Bağımlılıklar ve ayarlar

```bash
cd deniz-dent/sesli-asistan
npm install

cp .env.example .env
cp config/klinik.ornek.json config/klinik.json
```

`.env` dosyasını doldurun. `GENEL_ADRES` Twilio'nun size ulaşacağı **https**
adresidir (Railway size verir); imza doğrulaması buna bağlıdır.

### 3. Panel parolası

```bash
npm run hash -- 'en-az-10-karakterli-parolaniz'
```

Çıkan bcrypt değerini `.env` içindeki `PANEL_PAROLA_HASH` alanına yazın.
Parolanın kendisi hiçbir yere kaydedilmez.

### 4. Veritabanı

```bash
npm run migrate
```

### 5. Klinik bilgisi — **en önemli adım**

`config/klinik.json` asistanın bildiği **her şeydir**. Burada olmayan bilgiyi
asistan uydurmaz, ekibe devreder.

Klinikle birlikte doldurulacaklar:
- `klinik.adres`, `adres_tarifi`
- `mesai.haftalik`, `mesai.kapali_gunler` (resmî tatiller)
- `hizmetler`
- `fiyatlar` — **`onayli: true` yapmadan önce klinikten yazılı onay alın**
- `acil.anahtar_kelimeler` — hekimle birlikte gözden geçirin
- `sik_sorulanlar` — en az 30 soru hedefleyin

> `onayli: true` işaretli ama `alt`/`ust` bandı boş bir fiyat varsa sunucu
> **açılmaz**. Bu kasıtlı: sessizce yanlış fiyat söylemektense hiç açılmasın.

### 6. Çalıştırma

```bash
npm start
```

### 7. Twilio numarası

Twilio Console → Phone Numbers → numaranız:

| Alan | Değer |
|---|---|
| A CALL COMES IN | Webhook · **HTTP POST** |
| URL | `https://<GENEL_ADRES>/twilio/gelen-cagri` |

---

## Türkçe ses doğrulaması (ilk iş)

Teklifte "5. hafta teknik doğrulama" diye yazdığımız madde budur ve
**kod yazmakla kapanmaz — gerçek bir çağrı gerekir.**

Doğrulanacaklar:

1. **`SES_DILI=tr-TR` Twilio tarafında destekleniyor mu?** Twilio'nun desteklenen
   dil listesini resmî dokümanda doğrulayamadım. Test çağrısında ses gelmezse
   veya İngilizce aksanla okursa, `TTS_SAGLAYICI` ve `TTS_SES` ile oynayın
   (varsayılan sağlayıcı ElevenLabs ve Türkçesi iyidir).
2. **Konuşma tanıma Türkçe'yi doğru anlıyor mu?** Özellikle isim, tarih ve
   telefon numarası. Geri okuma teyidi bunun için var ama STT çok kötüyse
   `transcriptionProvider` değiştirilmeli.
3. **Gecikme kabul edilebilir mi?** Hedef: hasta sustuktan sonra ~1–1,5 saniye
   içinde ses başlamalı. Yüksekse sırayla deneyin:
   - `ASISTAN_EFFORT=low` (zaten varsayılan)
   - `ASISTAN_MAX_TOKENS` düşürün
   - `ASISTAN_MODEL=claude-haiku-4-5`

Sonucu yazın — teklifin Faz 3 takvimi buna bağlı.

---

## Test

```bash
npm test
```

29 test; ürünün en riskli üç davranışını koruyorlar:

| Test | Neyi korur |
|---|---|
| `acil.test.js` | Acil ifadelerin kaçırılmaması, sıradan soruların tetiklememesi |
| `klinik.test.js` | **Onaysız fiyatın asla sızmaması**, mesai/tatil hesabı, tarih doğrulama |
| `ses-yazici.test.js` | `last` bayrağının tam bir kez ve doğru yerde gitmesi |

Testler saf modüllere bakar; veritabanı veya API anahtarı gerektirmez.

---

## Güvenlik ve KVKK

Uygulanmış olanlar:

- **Twilio imza doğrulaması** hem HTTP uçlarında hem WebSocket upgrade'inde.
  Doğrulanmayan istek 403 alır ve denetim kaydına yazılır.
- **Parola bcrypt** (maliyet 12), **oturum token'ı sha256 hash'li** saklanır —
  veritabanı sızsa bile token kullanılamaz.
- **Giriş denemesi sınırı**: 10 dakikada 10 deneme.
- **Denetim kaydı**: her AI eylemi, her fiyat sorgusu, her panel kararı.
- **Hata zarfı**: iç detay dışarı çıkmaz, referans numarası log'a bağlar.
- **Hasta tıbbi kaydı burada tutulmaz** — o, kliniğin mevcut sisteminde kalır.
  Burada yalnızca iletişim verisi ve görüşme dökümü var; KVKK yüzeyi bilerek dar.
- **Ses kaydı yok**, sadece yazılı döküm.
- `config/klinik.json` ve `.env` depoya girmez.

**Kurulum öncesi kapatılacaklar:**

1. **Saklama süresi görevi.** `db/schema.sql` sonundaki `DELETE` ifadeleri yorumda
   duruyor. Günlük çalışacak bir zamanlanmış göreve bağlanmalı — silme niyete
   değil uygulamaya bağlı olmalı.
2. **Aydınlatma metni ve açık rıza** metinleri klinik adına hazırlanmalı.
   Şu an karşılamada sözlü bilgilendirme var (`kvkk.sozlu_bilgilendirme`), bu tek
   başına yeterli değil.
3. **Veri işleyen sözleşmesi (DPA)** — model sağlayıcısı yurt dışında.
4. **Yedekleme** — yönetilen Postgres kullanıyorsanız otomatik; doğrulayın.

---

## Henüz yapılmayanlar

Bilerek kapsam dışı bırakıldı, teklifin sonraki adımlarında:

- **Mevcut klinik sistemine yazma (A yolu).** Şu an B yolu çalışıyor: talep sabah
  onay kuyruğuna düşer, ekip tek tıkla onaylar. A yolu için kliniğin sisteminin
  adı ve bağlantı imkânı gerekiyor — `src/araclar.js` içindeki
  `randevuAraci` bunun bağlanacağı yer.
- **WhatsApp kanalı.** `src/ajan.js` kanal bağımsız yazıldı; WhatsApp webhook'u
  aynı `Gorusme` sınıfını kullanabilir.
- **Dokuz dil.** Altyapı hazır (ConversationRelay `language` mesajı ile oturum
  içinde dil değişebiliyor), içerik ve akış yazılmadı.
- **Giden arama** (hatırlatma, gelmeyen hasta geri kazanımı).
- **Panel rol ayrımı** — şu an tek kullanıcı. Hekim/resepsiyon ayrımı gerekecek.

---

## Sorun giderme

| Belirti | Bakılacak yer |
|---|---|
| Sunucu açılmıyor, "Eksik ortam degiskeni" | `.env` eksik alan |
| Sunucu açılmıyor, "onayli isaretlenmis ama alt/ust bandi bos" | `config/klinik.json` fiyat kaydı |
| Twilio 403 alıyor | `GENEL_ADRES` gerçek dış adresle birebir aynı mı |
| Çağrı açılıyor ama sessiz | WebSocket imzası — log'da "imza dogrulanamadi" var mı |
| Asistan fiyat söylemiyor | Beklenen davranış — `onayli: false` |
| Panel 401 veriyor | Oturum süresi doldu (`PANEL_OTURUM_SAAT`) |
| `/saglik` 503 | Veritabanı erişilemiyor |
