# SIP Sağlayıcı Teklif İsteği — Sesli AI Asistan Hattı

**Hazırlayan:** MİZ / My İnovatif Zeka
**Tarih:** 04.10.2026
**Amaç:** Deniz Dent Diş Polikliniği için 7/24 çalışan sesli yapay zekâ
asistanının telefon altyapısı

---

## 0. Neden bu belge var — İÇ NOT (sağlayıcıya gönderilmez)

Maliyet modeli şunu gösterdi: aylık maliyetin **%76'sı telefon**, yapay zekâ
yalnızca **%4**. Twilio'nun kendi Türkiye dakika ücretiyle (gelen çağrı
$0,0701/dk) günde 100 çağrı aylık ~69.000 ₺ ham maliyet demek.

Bu kalemi düşürmeden fiyat veremeyiz. Teklif alınacak nokta burası.

**Mimari açısından iyi haber:** Twilio'nun **BYOC (Bring Your Own Carrier)**
özelliği var. Kendi operatörümüzü Twilio'ya SIP trunk ile bağlayıp
ConversationRelay'i (yapay zekâ ses katmanı) aynen kullanmaya devam
edebiliyoruz. Yani yazdığımız kodun hiçbir yeri değişmiyor; sadece
çağrının geldiği bacak Türk operatöre taşınıyor.

İki yol var, ikisi için de teklif isteyeceğiz:

| Yol | Ne değişir | Kod değişikliği |
|---|---|---|
| **1. BYOC** | Türk operatör → Twilio → bizim sunucu | Yok |
| **2. Doğrudan SIP** | Türk operatör → bizim sunucu | Var (STT'yi kendimiz yapmalıyız) |

Yol 1 hızlı ve risksiz. Yol 2 daha ucuz ama geliştirme işi getiriyor.
Önce 1'i fiyatlandırıp, 2'yi ancak fark büyükse değerlendireceğiz.

---

## 1. Kimden teklif alınacak

> **Not:** Aşağıdaki firma adları genel bilgiye dayanıyor; güncel durumları
> ve fiyatları doğrulanmalı. Arama sonuçlarında yalnızca Plivo'nun Türkiye
> SIP fiyatı teyit edilebildi (sabit hat ~$0,06/dk).

**Türkiye merkezli (öncelik — BTK uyumu ve yerel numara için):**

| Firma | Neden listede |
|---|---|
| Verimor | Bulut santral ve SIP trunk sağlayıcısı, API'si var |
| Netgsm | Yaygın, numara portföyü geniş |
| Bulutfon | Bulut santral odaklı |
| Türk Telekom / Turkcell / Vodafone kurumsal | Doğrudan operatör, SIP trunk ürünleri var |
| İşNet | Kurumsal ses hizmetleri |

**Uluslararası (karşılaştırma için):**

| Firma | Not |
|---|---|
| Plivo | Türkiye SIP trunk sabit ~$0,06/dk (teyit edildi) |
| Telnyx, Voxbone/Bandwidth, Didww | Türkiye DID'i olabilir, BTK durumu sorulmalı |

---

## 2. Sağlayıcıya gönderilecek metin

> Aşağıdaki bölümü olduğu gibi kopyalayıp gönderebilirsiniz.

---

### Merhaba,

İzmir'de bir diş polikliniği için 7/24 çalışan, yapay zekâ destekli telefon
asistanı kuruyoruz. Gelen çağrıları otomatik karşılayan bir sistem.
Telefon altyapısı için teklifinizi rica ediyoruz.

### Kullanım profili

| | |
|---|---|
| Gelen çağrı (günlük) | ~100 |
| Gelen çağrı (aylık) | ~3.000 |
| Ortalama görüşme süresi | 2–3 dakika |
| Aylık toplam dakika | ~7.500 |
| Yön | **Ağırlıklı GELEN.** Giden çağrı çok az (geri arama) |
| Çalışma saati | 7/24 |
| Eşzamanlı çağrı (tahmini tepe) | 10 kanal |
| Numara | Kliniğin mevcut numarası taşınacak |

### Teknik gereksinimler

1. **SIP trunk** — gelen çağrı sonlandırma (termination)
2. **Numara taşıma (portasyon)** — kliniğin mevcut sabit numarası
3. **Kodek:** G.711 A-law tercih ediyoruz.
   **Önemli:** Sistem konuşmayı metne çeviriyor. G.729 gibi yüksek sıkıştırmalı
   kodekler Türkçe tanıma başarısını düşürüyor. A-law desteği şart.
4. **Kimlik doğrulama:** IP tabanlı veya SIP kullanıcı/parola — hangisi mümkün?
5. **Şifreleme:** SIP TLS ve SRTP destekliyor musunuz?
   (Sağlık verisi taşındığı için KVKK açısından önemli.)
6. **Arayan numara (CLI) iletimi** — hastanın numarasını görmemiz gerekiyor
7. **DTMF:** RFC 2833 desteği (hasta tuşa basarak bilgilendirme dinleyebiliyor)

### Twilio ile birlikte çalışma

Sistemimiz Twilio üzerinde çalışıyor. Twilio'nun **BYOC (Bring Your Own
Carrier)** yapısıyla trunk'ınızı bağlamayı planlıyoruz.

- Çağrıları bir **FQDN'e** (alan adına) yönlendirebiliyor musunuz?
- Twilio'nun IP aralıklarına çağrı gönderme konusunda kısıtınız var mı?
- Daha önce Twilio BYOC entegrasyonu yaptınız mı?

### Fiyat için doldurmanızı rica ettiğimiz tablo

| Kalem | Birim | Fiyat |
|---|---|---|
| Gelen çağrı — sabit hat | ₺/dakika | |
| Gelen çağrı — mobilden gelen | ₺/dakika | |
| Giden çağrı — sabit | ₺/dakika | |
| Giden çağrı — mobil | ₺/dakika | |
| SIP trunk aylık ücret | ₺/ay | |
| Eşzamanlı kanal ücreti (10 kanal) | ₺/ay | |
| Numara taşıma (tek seferlik) | ₺ | |
| Numara aylık kirası | ₺/ay | |
| Kurulum / aktivasyon | ₺ | |

**Faturalandırma dilimi:** Saniye bazlı mı (1/1), yoksa dakika yuvarlamalı mı
(60/60)? Ortalama görüşmemiz 2–3 dakika olduğu için bu fark bizim için
belirleyici.

**Taahhüt:** Aylık minimum kullanım taahhüdü var mı? Süreli sözleşme
zorunlu mu?

### Diğer sorular

- BTK nezdinde yetkilendirmeniz var mı? (Kurumsal müşteri olarak sormamız gerekiyor)
- SLA / çalışma süresi garantisi nedir?
- Teknik destek saatleri? 7/24 çalışacağımız için gece arızasında ne oluyor?
- Test için deneme hesabı / kredi verebiliyor musunuz?
- Çağrı kayıtları sizin tarafınızda tutuluyor mu? **Tutulmamasını tercih
  ediyoruz** (KVKK — ses kaydı almıyoruz).

Teşekkürler.

**MİZ / My İnovatif Zeka**

---

## 3. Twilio'ya ayrıca sorulacaklar

Bunlar sağlayıcıya değil, Twilio'ya sorulacak:

1. **Türkiye'de sesli yerel numara satıyor musunuz?**
   Arama sonuçları satmadığınızı söylüyor; teyit istiyoruz. Satmıyorsanız
   BYOC zaten tek yol.
2. **BYOC trunking dakika ücreti nedir?**
   Kendi operatörümüzü bağladığımızda Twilio hangi dakika ücretini alıyor?
   Bu rakam maliyet modelinde eksik — doldurulması gerekiyor.
3. **ConversationRelay, BYOC trunk üzerinden gelen çağrılarda sorunsuz
   çalışıyor mu?** Dokümantasyon bunu açıkça söylemiyor.
4. ConversationRelay'in $0,07/dk ücreti hacim indirimine tabi mi?

---

## 4. Teklifleri karşılaştırma tablosu

Teklifler gelince bu tabloyu doldurup maliyet modeline işleyeceğiz.

| | Sağlayıcı A | Sağlayıcı B | Sağlayıcı C |
|---|---|---|---|
| Firma adı | | | |
| Gelen ₺/dk (sabit) | | | |
| Gelen ₺/dk (mobil) | | | |
| Aylık sabit ücretler (₺) | | | |
| Faturalandırma dilimi | | | |
| A-law destekliyor mu | | | |
| TLS/SRTP | | | |
| Twilio BYOC deneyimi | | | |
| Numara taşıma süresi | | | |
| **Aylık toplam (7.500 dk)** | | | |

---

## 5. Karar kriteri

Sadece en ucuzu seçmiyoruz. Sırayla:

1. **A-law kodek desteği** — yoksa eleniyor. Türkçe tanıma kalitesi
   bütün ürünün temeli; sıkıştırılmış sesten iyi metin çıkmıyor.
2. **Faturalandırma dilimi** — 60/60 yuvarlama, 2,5 dakikalık görüşmelerde
   faturayı ciddi şişiriyor. Saniye bazlı olan, dakika fiyatı biraz
   yüksek olsa bile daha ucuza gelebilir.
3. **Numara taşıma süresi** — projeyi bu bekletir.
4. **Dakika fiyatı.**
5. **Gece desteği** — 7/24 çalışan bir sistemde gece arızası, sabah
   çözülecek bir şey değil.

---

## 6. Sonraki adım

Teklifler gelince `Deniz-Dent-Maliyet-Modeli.xlsx` dosyasındaki
**Kaldıraçlar** sayfasına gerçek rakamlar girilecek. Şu an oradaki
B ve C senaryolarındaki dakika ücretleri **varsayımdır** ve bu haliyle
müşteriye gösterilmez.
