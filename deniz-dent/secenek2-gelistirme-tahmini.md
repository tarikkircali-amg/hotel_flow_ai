# Seçenek 2 — Geliştirme Tahmini

**Tarih:** 06.10.2026
**Soru:** Twilio'yu çıkarıp Verimor + kendi medya katmanımıza geçmek kaç gün?

**Cevap: 20–28 iş günü. Planlama için 24 gün alın.**

---

## 1. Neyi kaybediyoruz, neyi koruyoruz

Bugün Twilio ConversationRelay bizim için **üç iş** yapıyor:

1. Konuşmayı metne çevirmek (STT)
2. Metni sese çevirmek (TTS)
3. Sıra yönetimi — hasta ne zaman sustu, ne zaman sözümüzü kesti

Seçenek 2'de bu üçünü kendimiz kuruyoruz.

### Değişen kod

| Dosya | Satır | Durum |
|---|---|---|
| `src/twilio.js` | 308 | **Yerine yenisi yazılacak** |
| `src/ses-yazici.js` | 43 | **Yerine yenisi yazılacak** |
| `src/ses.js` | 162 | Büyük ölçüde değişecek (dosya üretimi → canlı akış) |
| **Toplam** | **~510** | Kodun **%13'ü** |

### Korunan kod

| Ne | Satır |
|---|---|
| Ajan çekirdeği (`ajan.js`) | 564 |
| Acil tarama, gizlilik duvarı, zorunlu aktarım, söylem denetimi | 373 |
| Araçlar, klinik mantığı, SMS | 641 |
| Veritabanı katmanı (3 dosya) | 554 |
| Panel, WhatsApp, demo | 790 |
| **Toplam** | **~3.300 satır — kodun %87'si** |

**194 testin tamamı geçerliliğini koruyor.** Acil tarama, KVKK maskeleme,
kiracı izolasyonu, tanıtım koruması — hiçbiri telefonla ilgili değil.

Bu tesadüf değil: `Gorusme` sınıfını baştan kanal bağımsız yazdık. WhatsApp'ı
eklerken de bir satır değiştirmemiştik.

---

## 2. İş kalemleri

| # | İş | Gün | Risk |
|---|---|---|---|
| A | STT sağlayıcı seçimi + **Türkçe doğruluk testi** | 2 | — |
| B | Verimor SIP → LiveKit giriş, çağrı karşılama, CLI aktarımı | 3–4 | Orta |
| C | Akışlı STT + sessizlik tespiti (hasta sustu mu) | 3–4 | **Yüksek** |
| D | TTS akışı: ElevenLabs → canlı ses karesi | 3 | Orta |
| E | **Söz kesme (barge-in)** | 2–3 | **Yüksek** |
| F | Çağrı yaşam döngüsü: aktarım, kapatma, hata halleri | 2 | Orta |
| G | DTMF (RFC 2833) → mevcut `tusaBasildi()` | 1 | Düşük |
| H | Dağıtım, izleme, yeniden bağlanma, eşzamanlı çağrı testi | 2–3 | Orta |
| I | Gerçek hatta uçtan uca test, gecikme ve doğruluk ölçümü | 3 | — |
| | **Toplam** | **21–25** | |

Tampon payıyla **20–28 gün**, planlama rakamı **24 gün**.

---

## 3. Tahmini patlatabilecek iki şey

Dürüst olmam gereken yer burası. Yukarıdaki kalemlerin çoğu öngörülebilir;
ikisi değil.

### Söz kesme ve yankı (kalem E)

Hasta asistanın sözünü kestiğinde konuşmayı durdurmamız gerekiyor. Zor
kısmı şu: mikrofon **kendi sesimizi de duyuyor.** Yankı bastırma doğru
ayarlanmazsa asistan kendi sesini hasta sanıp sürekli kendini keser.

Twilio bunu bizim için çözüyordu. Kendimiz kurduğumuzda hat kalitesine
göre ayar gerekiyor ve bu, laboratuvarda değil **gerçek hatta** ayarlanan
bir şey.

### Türkçe konuşma tanıma kalitesi (kalem C)

Gürültülü ortamdan arayan, ağrısı olan, telaşlı bir hastanın Türkçesini
telefon hattı kalitesinde doğru tanımak kolay değil. Sağlayıcıların
reklamları ile gerçek başarı farklı olabiliyor.

**Bu yüzden A kalemini en başa koydum:** sağlayıcı seçmeden önce gerçek
klinik cümleleriyle ölçüm yapacağız. Sonuç kötüyse Seçenek 2 zaten
mantıklı olmaktan çıkar ve 2 günde öğrenmiş oluruz — 20 gün sonra değil.

---

## 4. Geri ödeme hesabı

| | |
|---|---|
| Geliştirme maliyeti | 24 gün × 4.000 ₺ = **96.000 ₺** |
| Aylık tasarruf (Seçenek 1 → 2) | **22.500 ₺** |
| **Geri ödeme süresi** | **~4,3 ay** |

İkinci müşteride geliştirme maliyeti sıfır, tasarruf aynen devam ediyor.
Üç kliniğe çıkarsak yatırım ilk ayda geri dönüyor.

**Ama bu hesap tek müşteri için zayıf.** Deniz Dent tek başına kalırsa
4 aylık geri ödeme, 20+ günlük riski karşılamaz.

---

## 5. Önerim: ikisini sırayla yap

Tek seçenek seçmek zorunda değiliz.

**Faz 1 — Seçenek 1 ile canlıya çık (bu hafta başlayabilir)**

Verimor SIP → Twilio BYOC → mevcut kod. Hiçbir şey yazmıyoruz, sadece
hattı bağlıyoruz. Klinik sistemi görüyor, biz gerçek veri topluyoruz:
gerçekte kaç çağrı geliyor, ortalama kaç dakika, hangi sorular soruluyor.

Maliyet 44.300 ₺/ay. Yüksek ama **gelir akmaya başlıyor.**

**Faz 2 — Seçenek 2'yi arka planda geliştir**

Gerçek çağrı kayıtlarıyla STT'yi ölçeriz — varsayımla değil. Hazır
olduğunda geçiş yaparız; klinik tarafında hiçbir şey değişmez, aynı
numara, aynı asistan.

**Neden böyle:** Şu an elimizde **tek bir gerçek çağrı verisi yok.**
Günde 100 çağrı, 2,5 dakika ortalama — ikisi de kliniğin tahmini.
Gerçek sayı 40 çağrı çıkarsa Seçenek 2'nin tasarrufu yarıya iner ve
geri ödeme 9 aya uzar. 200 çıkarsa tersi olur.

**20 günlük bir yatırımı, doğruluğunu bilmediğimiz bir tahmine
dayandırmayalım.** Bir ay gerçek veri topladıktan sonra bu karar
kendiliğinden netleşir.

---

## 6. Hemen yapılabilecekler

Seçenek 2 kararı beklemeden:

1. **Verimor 15 günlük demo** — taahhüt yok, ön ödemeli. Hattı bağlayıp
   gerçek bir çağrıyı uçtan uca görelim.
2. **STT ölçümü (2 gün)** — birkaç sağlayıcıyı gerçek Türkçe klinik
   cümleleriyle karşılaştıralım. Bu ölçüm Seçenek 2'nin ön koşulu ve
   sonucu her halükârda işimize yarar.
3. **Twilio BYOC dakika ücreti** — Seçenek 1'in maliyeti bunsuz kesin değil.
