# Verimor Teklifi — Değerlendirme ve Cevap

**Tarih:** 06.10.2026
**Kaynak:** Verimor e-postası + Bulut Santral Ses/SMS Paket Ücretleri PDF

---

## 1. Tek cümlelik özet

**Verimor numaralarına gelen çağrılarda dakika ücreti yok.** Maliyet
modelimizdeki en büyük kalem (aylık maliyetin %76'sı olan telefon
dakikası) bununla büyük ölçüde ortadan kalkıyor.

---

## 2. Rakamlar nereden nereye geldi

Günde 100 çağrı, ortalama 2,5 dakika, 7/24 varsayımıyla:

| Kurgu | Aylık maliyet | Çağrı başına |
|---|---|---|
| Önceki model — Twilio tam | 68.900 ₺ | 23,0 ₺ |
| **Seçenek 1** — Verimor + Twilio BYOC | **44.300 ₺** | 14,8 ₺ |
| **Seçenek 2** — Verimor + kendi medya katmanımız | **~21.800 ₺** | 7,3 ₺ |

Seçenek 2'de maliyet üçte bire iniyor.

---

## 3. İki mimari seçenek

### Seçenek 1 — Verimor SIP → Twilio BYOC → ConversationRelay

```
Hasta → Verimor (gelen dakika ücretsiz) → Twilio BYOC → ConversationRelay → bizim sunucu
```

**Artısı:** Yazdığımız kodun hiçbir yeri değişmiyor. Bugün çalışan sistem
aynen çalışır.

**Eksisi:** ConversationRelay'in $0,07/dakika ücreti duruyor — ki yeni
durumda maliyetin en büyük kalemi artık o. Ayrıca Twilio'nun BYOC dakika
ücretini henüz bilmiyoruz; model bu haliyle eksik.

### Seçenek 2 — Verimor SIP → kendi medya katmanımız

```
Hasta → Verimor → LiveKit → kendi STT + ElevenLabs + Claude → bizim sunucu
```

**Artısı:** Twilio tamamen devre dışı. Maliyet yarıdan fazla düşüyor.
Verimor'un dokümantasyonunda **LiveKit ve ElevenLabs entegrasyonları
zaten var** — yani bizim kurmak istediğimiz yapıyı destekliyorlar.

**Eksisi:** Geliştirme işi getiriyor. Bugün ConversationRelay'in bizim
için yaptığı iki şeyi (ses akışı yönetimi ve konuşmayı metne çevirme)
kendimiz kurmamız gerekiyor.

**Önemli:** Asıl değerli kodumuz etkilenmiyor. Acil tarama, gizlilik
duvarı, zorunlu aktarım, fiyat yönetişimi, sabah kuyruğu — hepsi kanal
bağımsız yazıldı. Değişecek olan yalnızca sesin girdiği kapı.

---

## 4. Verimor fiyatları (fiyat listesinden, KDV hariç)

### Bulut Santral paketleri

| Paket | Kapasite | 6 aylık | 12 aylık |
|---|---|---|---|
| Mini | 2 kullanıcı / 2 dış hat | 429 ₺/ay | 366 ₺/ay |
| X Small | 5 kullanıcı / 3 dış hat | 565 ₺/ay | 483 ₺/ay |
| Small | 10 kullanıcı / 5 dış hat | 659 ₺/ay | 563 ₺/ay |

### İhtiyacımız olan modül

| Modül | Aylık | 6 aylık | 12 aylık |
|---|---|---|---|
| **SIP Trunk** | 899 ₺ | 824 ₺/ay | 768 ₺/ay |

Bize gereken tek modül bu. **TTS Robotu (479 ₺) ve Speech to Text
(999 ₺) modüllerine ihtiyacımız yok** — seslendirmeyi ElevenLabs,
konuşma tanımayı kendi katmanımız yapıyor.

### Toplam sabit gider

X Small + SIP Trunk = 1.464 ₺ + KDV = **~1.757 ₺/ay**

---

## 5. E-postadaki rakamlarla fiyat listesi uyuşmuyor

E-postada:
- "2 kullanıcılı **5.731 ₺**+KDV"
- "5 kullanıcı **7.576 ₺**+KDV"

Fiyat listesinde:
- Mini (2 kullanıcı): 6 aylık **2.574 ₺**, 12 aylık **4.397 ₺**
- X Small (5 kullanıcı): 6 aylık **3.390 ₺**, 12 aylık **5.791 ₺**
- Medium (25 kullanıcı): 12 aylık **7.575 ₺**

E-postadaki 7.576 ₺ listede **25 kullanıcılı Medium** paketin 12 aylık
fiyatı. Kullanıcı sayıları kaymış görünüyor. **Sorulmalı** — yanlış paketi
fiyatlamayalım.

---

## 6. Diğer bulgular

**Eşzamanlı kanal 6 — bizim için yeterli.** 100 çağrı/gün, 2,5 dakika
ortalamayla yoğun saatte bile kanal doluluğu 1'in altında kalıyor. Artırma
ihtiyacı doğarsa yapılabiliyormuş.

**Taahhüt yok, ön ödemeli.** Pilot için ideal — bağlanmadan deneyebiliyoruz.

**15 günlük demo hesabı verebiliyorlar.** Bunu almalıyız.

**CDR ve ses kayıtlarına ücretsiz API erişimi var.** Ses kaydı bizim
tasarımımızda kapalı; ama CDR (çağrı detay kaydı) raporlama için işimize
yarar.

**Numara taşıma ücretsiz.** Tahsis 468 ₺ tek seferlik, ilk numara
ücretsiz. (E-postada "taşıma ücretsizdir" ve "tahsis 468 ₺" birlikte
yazılmış; hangisinin bize uygulanacağı netleştirilmeli.)

**WhatsApp tarafı bizim işimizi görmüyor.** Verimor şu an yalnızca OTP
ve bilgilendirme SMS'i gönderebiliyor. Bizim kurduğumuz WhatsApp kanalı
**çift yönlü sohbet** — hasta yazıyor, asistan cevaplıyor. Bunun için
Meta Cloud API gerekiyor ve o yol zaten kodda hazır. Verimor'un WhatsApp
ürünü bunun yerine geçmez.

**Partner yapısı:** Faturayı Verimor doğrudan müşteriye kesiyor, biz
komisyon alıyoruz. Bu, teklifimizin yapısını etkiler — Deniz Dent'e
"telefon altyapısı bizden" diyemeyiz, onlar Verimor'la ayrı abone olur.
Teklifte bunu nasıl göstereceğimize karar vermeliyiz.

---

## 7. Verimor'a gönderilecek cevap

> Aşağıdaki metni olduğu gibi kullanabilirsiniz.

---

Merhaba,

Detaylı bilgilendirme için teşekkür ederiz. Dokümanları inceledik,
birkaç noktayı netleştirmek istiyoruz.

**1. Paket fiyatlarında uyuşmazlık**

E-postanızda 2 kullanıcılı paket için 5.731 ₺+KDV, 5 kullanıcılı için
7.576 ₺+KDV yazıyor. Gönderdiğiniz fiyat listesinde ise Mini (2 kullanıcı)
6 aylık 2.574 ₺, X Small (5 kullanıcı) 6 aylık 3.390 ₺ görünüyor.
Hangisi geçerli, hangi periyot için?

**2. Kurgumuz ve gereken modüller**

Yapımız şöyle: gelen çağrıyı kendi sunucumuzdaki yapay zekâ asistanı
karşılıyor. Seslendirmeyi ElevenLabs, konuşma tanımayı kendi katmanımız
yapıyor. Yani sizin TTS Robotu ve Speech to Text modüllerinize ihtiyacımız
olmadığını düşünüyoruz.

- Bu kurguda **SIP Trunk modülü (899 ₺/ay)** dışında zorunlu başka modül
  var mı?
- Bulut Santral paketi de zorunlu mu, yoksa yalnızca SIP Trunk ile
  ilerlenebiliyor mu?

**3. LiveKit entegrasyonu**

Paylaştığınız LiveKit dokümanını inceledik. Bizim senaryomuz tam olarak
bu: gelen çağrı → LiveKit → kendi yapay zekâ katmanımız.

- Bu kurguda gelen çağrı dakikası gerçekten ücretsiz mi?
- LiveKit tarafında sizin ek bir ücretlendirmeniz var mı?
- Bu entegrasyonu kullanan iş ortaklarınızda karşılaştığınız yaygın
  sorunlar neler?

**4. Teknik gereksinimler**

- Kodek olarak **G.711 A-law** destekliyor musunuz? Konuşmayı metne
  çevirdiğimiz için sıkıştırılmış kodekler tanıma başarısını düşürüyor.
- SIP TLS ve SRTP destekliyor musunuz? (Sağlık verisi taşındığı için
  KVKK açısından soruyoruz.)
- Arayan numara (CLI) bilgisi iletiliyor mu?
- DTMF için RFC 2833 destekleniyor mu? (Hasta tuşa basarak aydınlatma
  metni dinleyebiliyor.)

**5. Numara**

Kliniğin mevcut 0232 numarası taşınacak. Taşımanın ücretsiz olduğunu
yazmışsınız; 468 ₺ tahsis ücreti bu durumda uygulanmıyor, doğru mu?
Taşıma ne kadar sürüyor?

**6. Ses kaydı**

Tasarımımızda görüşmelerin **ses kaydı alınmıyor**, yalnızca yazılı
döküm tutuluyor (KVKK gereği). Sizin tarafınızda ses kaydını tamamen
kapatabiliyor muyuz?

**7. Demo**

15 günlük Bulut Santral demosunu memnuniyetle değerlendiririz. Başvuruyu
yapıyoruz.

Teşekkürler.

**MİZ / My İnovatif Zeka**

---

## 8. Bizim kendi içimizde cevaplamamız gerekenler

1. **Seçenek 1 mi, 2 mi?** Fark aylık ~22.500 ₺. Seçenek 2 geliştirme
   işi getiriyor; kaç günlük iş olduğunu çıkarmalıyız.
2. **STT'yi kim yapacak?** Seçenek 2'nin eksik parçası. Türkçe tanıma
   kalitesi ve fiyatı için sağlayıcı araştırması gerekiyor.
3. **Twilio BYOC dakika ücreti** — Seçenek 1'i tamamlamak için şart.
4. **Faturalama kurgusu:** Verimor müşteriye doğrudan fatura kesiyor.
   Deniz Dent'e teklifi nasıl sunacağız — telefon altyapısı ayrı kalem mi,
   yoksa biz mi üstleniyoruz?
