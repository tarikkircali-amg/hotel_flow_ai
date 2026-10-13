# Daha Ucuz Mimariler — Araştırma

**Tarih:** 13.10.2026
**Soru:** Deniz Dent fiyatı yüksek buldu. Maliyeti nasıl düşürürüz?

---

## 0. Önce şunu netleştirelim

7/24 kurgusunda maliyetimiz **40.080 ₺/ay** ve bunun **33.300 ₺'si (%83) tek bir
kalem**: Twilio'nun dakika ücreti.

Claude 3.022 ₺, sunucu 2.000 ₺, Verimor 1.757 ₺. Yani geri kalan her şeyi
sıfırlasak bile ancak %17 kazanırız.

**Soru tek: $0,074/dakikanın yerine ne koyarız?**

---

## 1. Hazır platformlar — çıkmaz sokak

İlk baktığım yer buydu. Sonuç şaşırtıcı: **hiçbiri Twilio'dan ucuz değil.**

| Platform | $/dakika (her şey dahil) | Aylık |
|---|---|---|
| **Twilio ConversationRelay (bugün)** | **$0,074** | **40.080 ₺** |
| ElevenLabs Agents | $0,08–0,10 | 42.800–51.800 ₺ |
| Vapi | $0,09–0,14 | 47.300–69.800 ₺ |
| Retell AI | $0,11–0,17 | 56.300–83.300 ₺ |
| Bland AI | $0,14 | 69.800 ₺ |

Sebebi şu: hepsi aynı altyapıyı kiralıyor — telefon hattı, konuşma tanıma,
seslendirme. Platform ücreti bunun üstüne biniyor. Twilio'da zaten
rekabetçi bir fiyattayız.

**Dikkat:** Bu rakamlar üçüncü taraf karşılaştırma bloglarından ve kendi
aralarında çelişiyorlar. Ciddi bir karar öncesi sağlayıcıdan teyit alınmalı.
Ama hepsinin aynı bantta olması, tek tek yanlış olsalar bile tabloyu
değiştirmiyor.

---

## 2. Kendi medya katmanımız — Seçenek 2

Twilio'yu tamamen çıkarıp konuşma tanımayı ve ses akışını kendimiz kurmak.

| | Aylık |
|---|---|
| Deepgram çok dilli (promosyon fiyatı) | 22.704 ₺ |
| Deepgram çok dilli (normal fiyat) | 23.979 ₺ |

**%43 tasarruf.** Ama **20–28 iş günü geliştirme** gerekiyor ve Türkçe tanıma
kalitesi ölçülmeden karar verilemez. Deepgram'ın Türkçe desteği de
doğrulanmadı — çok dilli modelde var görünüyor ama teyit edilmeli.

Not: burada yuvarlama yok. Twilio kısmi dakikayı yukarı yuvarlıyor, kendi
katmanımızda gerçek süre üzerinden ödüyoruz — tasarrufun bir kısmı buradan.

---

## 3. Asıl bulgu: sorun sağlayıcı değil, kanal

Telefonun maliyeti **dakika başına**. WhatsApp'ın maliyeti **mesaj başına**.
Aradaki fark mertebe farkı.

| | Aylık | Görüşme başına |
|---|---|---|
| Telefon (bugün) | 40.080 ₺ | 13,36 ₺ |
| **Sadece WhatsApp** | **6.058–11.348 ₺** | **2,02–3,78 ₺** |

**Dört ila yedi kat ucuz.** Üstelik **WhatsApp kanalının kodu zaten yazılmış
durumda** — `src/whatsapp.js`, çalışıyor, test edilmiş.

Meta'nın yapısı: ayda ilk 1.000 servis mesajı ücretsiz, sonrası Türkiye
utility tarifesinden. 2,5 dakikalık bir telefon görüşmesi yerine 8 mesajlık
bir yazışma.

**Uyarı:** Türkiye utility tarifesi için kaynaklar **altı kat** çelişiyor
($0,0009 ile $0,0055 arası). Yukarıdaki aralığın iki ucu bu yüzden.
Meta'nın resmî tarife kartından doğrulanmalı.

**Gerçekçi engel:** Hasta telefon açmaya devam edecek. Kliniğin numarası
çalmaya devam ediyor ve "bize WhatsApp'tan yazın" diyen bir tabela
yetmiyor. Tek başına WhatsApp, çalan telefonu cevapsız bırakmak demek.

---

## 4. Melez — telefonu açan ama kısa tutan asistan

Bu ikisini birleştiriyor:

1. Asistan telefonu açar
2. **Acil taraması telefonda çalışır** — acilse hemen insana aktarır
3. Acil değilse: "Size WhatsApp'tan yazıyorum, oradan devam edelim" der,
   bağlantıyı gönderir ve kapatır (~20 saniye)
4. Görüşme WhatsApp'ta sürer

| Aktarım oranı | Aylık | Telefon | WhatsApp |
|---|---|---|---|
| %10 acil/aktarım | 25.764 ₺ | 13.320 ₺ | 5.665 ₺ |
| %20 acil/aktarım | 27.324 ₺ | 15.540 ₺ | 5.005 ₺ |

**%35 tasarruf, geliştirme neredeyse yok.** Her iki kanal da yazılmış
durumda; yapılacak iş telefon akışına "WhatsApp'a yönlendir" adımını
eklemek — birkaç günlük iş.

**Klinik açısından değeri:** Hasta hiçbir zaman cevapsız kalmıyor, acil
durum telefonda yakalanıyor, geri kalan yazıya dökülüyor. Yazılı kayıt
zaten KVKK tarafında bizim istediğimiz şey.

**Riski:** Yaşlı hastalar WhatsApp kullanmayabilir. Bu grup için telefonda
devam etmek gerekir; o çağrılar tam ücretten gider. Oran bilinmiyor.

---

## 5. Hepsi bir arada

| Kurgu | Aylık | Geliştirme | Not |
|---|---|---|---|
| Hazır platformlar | 40.000–83.000 ₺ | Yok | **Daha pahalı** |
| Bugünkü kurgu | 40.080 ₺ | — | Referans |
| **Melez (telefon → WhatsApp)** | **~26.000 ₺** | **Birkaç gün** | En iyi oran |
| Kendi medya katmanımız | ~24.000 ₺ | 20–28 gün | Türkçe STT riski |
| Melez + kendi katmanımız | ~18.000 ₺ | 20–28 gün | İkisi birleşirse |
| Sadece WhatsApp | 6.000–11.000 ₺ | Yok | Telefon cevapsız kalır |

---

## 6. Önerim

**Melezi fiyatla.** Birkaç günlük iş karşılığında maliyet 40.080 → 26.000 ₺'ye
iniyor. Bu, 7/24 kapsamını **32.000–34.000 ₺ bandında** satılabilir hâle
getiriyor — Şerif Bey'in gördüğü 45.000'den belirgin aşağıda ve hâlâ sağlıklı
bir marjla.

Hazır platformları eleyelim; araştırmanın en net sonucu bu.

Kendi medya katmanımız doğru hedef ama **şimdi değil**. Önce satış kapansın,
gerçek veri gelsin, sonra 20 günlük yatırımı bilerek yapalım.

---

## 7. Doğrulanması gerekenler

Hiçbiri bu belgedeki tabloyu ters çevirmez, ama rakamları oynatır:

| Ne | Nereden |
|---|---|
| Türkiye WhatsApp utility tarifesi (6 kat çelişki) | Meta resmî tarife kartı |
| Platform fiyatları | Sağlayıcıların kendi sayfaları |
| Deepgram Türkçe desteği ve fiyatı | Deepgram'dan teyit |
| Hastaların WhatsApp'a geçme oranı | Ölçülmeli — melezin tüm hesabı buna bağlı |
| Meta iş doğrulaması | Klinikten erişim bekleniyor, hâlâ açık |
