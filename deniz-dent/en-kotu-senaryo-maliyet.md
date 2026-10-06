# En Kötü Senaryo Maliyet Çalışması

**Hazırlayan:** MİZ / My İnovatif Zeka
**Tarih:** 06.10.2026
**Konu:** Deniz Dent Diş Polikliniği — 7/24 sesli yapay zekâ asistanı
**Amaç:** Hiçbir geliştirmeye başlamadan önce maliyetin **üst sınırını** görmek

---

## 0. Bu belge neden var

Klinik bizden maliyet istedi. İyimser bir rakam verip sonra "şu da çıktı"
demek istemiyoruz. Bu yüzden **üç kademe** hesapladık ve en kötüsünü de
açıkça yazdık.

Bütün rakamlar `Deniz-Dent-Maliyet-Modeli.xlsx` dosyasındaki **"En Kotu
Senaryo"** sayfasında formüllerle bağlıdır. Sarı hücreyi değiştirince
tablo kendini yeniden hesaplar — kimsenin bizim sözümüze güvenmesi
gerekmiyor.

**Baştan söylenmesi gereken:** Aşağıdaki rakamlar **bizim maliyetimizdir**,
kliniğe verilecek fiyat değildir. Fiyat yapısı 6. bölümde.

---

## 1. Tek sayfalık cevap

| | A — Beklenen | B — Kötü | C — EN KÖTÜ |
|---|---|---|---|
| Günlük çağrı | 100 | 150 | 200 |
| Ortalama süre | 2,5 dk | 3,0 dk | 3,5 dk |
| Aylık dakika | 7.500 | 13.500 | 21.000 |
| **Aylık maliyet (Seçenek 1)** | **44.279 ₺** | **97.696 ₺** | **212.508 ₺** |
| Çağrı başına | 14,76 ₺ | 21,71 ₺ | 35,42 ₺ |
| **Aylık maliyet (Seçenek 2)** | **21.779 ₺** | **47.096 ₺** | **130.608 ₺** |

*Seçenek 1 = Twilio ConversationRelay kalıyor (kod değişmiyor).
Seçenek 2 = kendi medya katmanımız (20–28 iş günü geliştirme).*

**En kötü hâlde aylık 212.500 ₺.** Beklenenin 4,8 katı.

---

## 2. Bu 4,8 kat nereden geliyor

Kademeden kademeye en çok büyüyen şey teknoloji fiyatları değil,
**dakika sayısı.**

| Ne değişti | A → C | Etkisi |
|---|---|---|
| Çağrı sayısı | 100 → 200/gün | **2,0 kat** |
| Görüşme süresi | 2,5 → 3,5 dk | **1,4 kat** |
| → Toplam dakika | 7.500 → 21.000 | **2,8 kat** |
| Kur | 50 → 60 | 1,2 kat |
| Diğer tüm birim fiyatlar | — | ~1,3 kat |

Yani **2,8 × 1,2 × 1,3 ≈ 4,4**. Kalanı Verimor paketinin yüksek
rakamından geliyor.

### Bunun pratik sonucu

| | Sabit (₺/ay) | Değişken (₺/dakika) |
|---|---|---|
| Seçenek 1 — beklenen | 3.757 | **5,40** |
| Seçenek 1 — en kötü | 18.156 | **9,25** |
| Seçenek 2 — beklenen | 3.757 | **2,40** |
| Seçenek 2 — en kötü | 18.156 | **5,35** |

**Sabit maliyet neredeyse yok. Maliyet tamamen dakika başına.**
Bu, fiyatın da dakika başına kurulması gerektiği anlamına geliyor —
6. bölümde buna döneceğiz.

---

## 3. Her kademede hangi varsayımı aleyhimize çevirdik

Dürüst olmak için her birini yazıyorum. C kademesinde hiçbir şey
iyimser değil.

| Varsayım | A | B | C | C neden böyle |
|---|---|---|---|---|
| Günlük çağrı | 100 | 150 | 200 | Klinik 100 dedi ama **elimizde tek bir gerçek veri yok** |
| Ortalama süre | 2,5 dk | 3,0 dk | 3,5 dk | Yapay zekâ ilk aylarda daha uzun konuşur |
| USD/TRY | 50 | 55 | 60 | Kur riski bizde değil ama modelde görünmeli |
| Twilio BYOC ₺/dk | 0 | 0,015 $ | 0,020 $ | **BİLİNMİYOR.** Twilio'ya sorduk, cevap gelmedi |
| Gelen dakika | ücretsiz | ücretsiz | 0,20 ₺/dk | Verimor "ücretsiz" yazdı; C'de bu sözün tutmadığını varsaydık |
| Seslendirme | 0,05 $ | 0,05 $ | 0,08 $ | Daha pahalı ses modeline geçmek zorunda kalırsak |
| Görüşme turu | 6 | 8 | 10 | Hasta daha çok soru sorarsa |
| Sistem metni | 2.500 tk | 3.000 tk | 4.000 tk | Klinik bilgisi büyüdükçe artar |
| Verimor sabit | 1.757 ₺ | 1.757 ₺ | 7.956 ₺ | Fiyat listesi yerine **e-postadaki yüksek rakam** |
| Sunucu | 40 $ | 60 $ | 170 $ | Yedekli kurulum + ayrı medya sunucusu |

### Modeli bilerek şişirmediğimiz iki yer

**Model seçimi.** Üç kademede de Claude Sonnet 5.5 kullandık, Opus'a
çıkmadık. Çünkü hangi modeli kullanacağımız **bizim kararımız**, kliniğin
riski değil. (Merak edenler için: Opus'a çıkarsak C kademesi 212.508 ₺
yerine 226.188 ₺ olurdu — %6,4 fark.)

**Önbellekleme.** Üç kademede de çalıştığını varsaydık. Çalışmazsa bu
bizim hatamızdır, biz düzeltiriz — müşteriye yansıtılacak bir risk değil.

Bu ikisini kasten dışarıda tuttuk: **kendi mühendislik kararlarımızın
riskini müşteriye fatura etmek dürüst olmaz.**

---

## 4. Kapsam en büyük kaldıraç

7/24 tüm çağrıları karşılamak zorunda değiliz. Kapsamı daraltmak maliyeti
doğrudan bölüyor.

| Kapsam | S1 beklenen | S1 en kötü | S2 beklenen | S2 en kötü |
|---|---|---|---|---|
| **7/24 — tüm çağrılar** | 44.279 ₺ | 212.508 ₺ | 21.779 ₺ | 130.608 ₺ |
| **Mesai dışı + hafta sonu** (çağrıların ~%35'i) | 17.940 ₺ | 86.179 ₺ | 10.065 ₺ | 57.514 ₺ |
| **Sadece gece 23:00–08:00** (~%12) | 8.620 ₺ | 41.478 ₺ | 5.920 ₺ | 31.650 ₺ |

**En kötü senaryoda bile mesai dışı kapsam 86.179 ₺,** 7/24'ün %41'i.

İlk teklifimiz (55.000 ₺ kurulum + 12.900 ₺/ay) mesai dışı kapsam içindi.
7/24'e geçmek maliyeti 2,5 kat artırıyor — bu, kapsam değişikliğinin
doğal sonucu, fiyatlamada bir hata değil.

---

## 5. Kurulum maliyeti (tek seferlik)

| | İş günü | Maliyet |
|---|---|---|
| Seçenek 1 — beklenen | 8 | 32.000 ₺ |
| Seçenek 1 — **en kötü** | 15 | **67.500 ₺** |
| Seçenek 2 — beklenen | 24 | 96.000 ₺ |
| Seçenek 2 — **en kötü** | 36 | **162.000 ₺** |

*(Günlük iç maliyet: beklenen 4.000 ₺, en kötü 4.500 ₺)*

**Seçenek 2'nin geliştirme maliyetini Deniz Dent'e yüklemiyoruz.**
O, bizim ürün yatırımımız; ikinci ve üçüncü klinikte sıfır maliyetle
tekrar kullanılıyor. Kliniğe yansıyan tek şey Seçenek 1'in kurulumu.

---

## 6. Peki fiyat ne olacak

Burada bir sorun var ve açıkça yazıyorum.

**Sabit fiyat verilemez.** Maliyetin %92'si dakika başına. Sabit bir aylık
ücret verirsek, çağrı iki katına çıktığında zararımız doğrudan iki katına
çıkar. Kliniğin de bilmediği bir hacim için bize risk yükleyecek bir fiyat
imzalaması mantıklı değil.

### Önerdiğimiz yapı: paket + aşım

| Kalem | Ne demek |
|---|---|
| **Aylık taban ücret** | Belirlenen dakika paketini kapsar |
| **Aşım ücreti** | Paketi aşan her dakika için ₺/dk |
| **Sabit altyapı** | Taban ücrete dahil |

7/24 ve 7.500 dakikalık paket örneği (Seçenek 1, bakım emeği 3 müşteriye
bölünmüş varsayımıyla):

| Gerçekleşen | Fatura | Bizim maliyetimiz | Brüt kâr |
|---|---|---|---|
| 7.500 dk (beklenen) | 59.986 ₺ | 49.257 ₺ | %17,9 |
| 11.250 dk | 83.274 ₺ | 69.507 ₺ | %16,5 |
| 15.000 dk | 106.561 ₺ | 89.757 ₺ | %15,8 |
| 21.000 dk (en kötü hacim) | 143.821 ₺ | 122.157 ₺ | %15,1 |

Bu yapı **hacim riskini** çözüyor: çağrı artarsa fatura da artıyor,
marjımız korunuyor.

### Ama bir risk çözülmüyor

Yukarıdaki tablo dakika **birim maliyetinin** 5,40 ₺ kaldığını varsayıyor.
En kötü senaryoda birim maliyet 9,25 ₺'ye çıkıyor. O zaman:

| Gerçekleşen | Fatura | Gerçek maliyet | Sonuç |
|---|---|---|---|
| 7.500 dk | 59.986 ₺ | 92.531 ₺ | **−32.545 ₺ zarar** |
| 21.000 dk | 143.821 ₺ | 217.406 ₺ | **−73.585 ₺ zarar** |

**Bu yüzden sözleşmeyi, tedarikçi fiyatlarını kilitlemeden imzalamamalıyız.**
Eksik olan iki rakam:

1. **Twilio BYOC dakika ücreti** — bilinmiyor
2. **Verimor'un "gelen dakika ücretsiz" sözü** — yazılı teyit alınmalı

Bu ikisi gelmeden verilecek her fiyat tahminden ibarettir. Teklifte
"tedarikçi fiyat değişikliğinde ücret revize edilir" maddesi olmalı.

---

## 7. Bakım emeği — görmezden gelinemeyecek kalem

Aylık 15.000 ₺ bakım/destek emeği (izleme, güncelleme, klinik talepleri)
**tek müşteriye bölünürse fiyatı ezer.**

| | 1 müşteri | 3 müşteri | 5 müşteri |
|---|---|---|---|
| 7/24 · Seçenek 1 | 78.194 ₺ | 60.012 ₺ | 56.375 ₺ |
| 7/24 · Seçenek 2 | 52.319 ₺ | 34.137 ₺ | 30.500 ₺ |
| Mesai dışı · Seçenek 1 | 47.904 ₺ | 29.722 ₺ | 26.086 ₺ |
| Mesai dışı · Seçenek 2 | 38.847 ₺ | 20.666 ₺ | 17.029 ₺ |

Deniz Dent **tek müşteri kalırsa** 7/24 fiyatı 78.000 ₺/ay civarında.
Üç kliniğe çıkarsak aynı hizmet 60.000 ₺.

Bu, Deniz Dent'e söylenmesi gereken bir şey değil ama **bizim
fiyatlandırma kararımızın merkezinde.** İlk müşteriyi pilot fiyatıyla
alıp bakım emeğini zamanla bölmek, sürdürülebilir olan yol.

---

## 8. Karşılaştırma: 7/24 insan resepsiyon

Kliniğin alternatifi ne?

7/24 = haftada 168 saat. Kişi başı 45 saat yasal çalışma, izin/hastalık/
bayram payı 1,2 kat → **4,5 kişi.**

| Kişi başı işveren maliyeti | 7/24 resepsiyon |
|---|---|
| 30.000 ₺/ay | 134.400 ₺/ay |
| 40.000 ₺/ay | 179.200 ₺/ay |
| 50.000 ₺/ay | 224.000 ₺/ay |

*(İşveren maliyeti varsayımdır, 2026 rakamı teyit edilmeli.)*

**Dürüst okuma:** Beklenen senaryoda (44.279 ₺) asistan insan
resepsiyonun belirgin altında. **Ama en kötü senaryoda (212.508 ₺) aynı
mertebeye çıkıyor.** Yani asistanın maliyet avantajı otomatik değil;
dakika ücretine ve çağrı hacmine bağlı.

Asistanın insana göre asıl farkı maliyette değil şurada:
hiç uyumaması, aynı anda birden fazla çağrıyı karşılaması, her görüşmenin
kaydını tutması ve tutarlı davranması. Maliyet avantajı bir bonus,
gerekçenin tamamı değil.

---

## 9. Riskler ve kimde olduğu

| Risk | Kimde | Nasıl yönetiyoruz |
|---|---|---|
| Çağrı hacmi tahminden yüksek | **Klinikte** | Paket + aşım yapısı |
| Görüşme süresi uzun | Paylaşımlı | Ölçüp asistanı kısaltıyoruz |
| Kur artışı | **Klinikte** | Fiyat dövize endeksli veya 6 ayda revize |
| Tedarikçi fiyat artışı | **Bizde** → sözleşmeye revizyon maddesi | Fiyatları önce yazılı alacağız |
| Türkçe tanıma kalitesi düşük | **Bizde** | Önce 2 günlük ölçüm, sonra karar |
| Geliştirme süresi aşımı (Seçenek 2) | **Bizde** | Kliniğe yansımıyor |
| Klinik 3 ayda vazgeçerse | **Bizde** | Kurulum bedeli peşin |

---

## 10. Bu rakamlar neyin üzerine kurulu — bilinmeyenler

Dürüstlük gereği: aşağıdakiler **bilinmiyor** ve modeli etkiliyor.

| Bilinmeyen | Etkisi | Nasıl kapanır |
|---|---|---|
| Gerçek çağrı sayısı | **Çok yüksek** — 4,8 katın kaynağı | 1 ay gerçek veri |
| Gerçek görüşme süresi | Yüksek | Aynı |
| Twilio BYOC dakika ücreti | Yüksek | Twilio'dan cevap |
| Verimor gelen dakika gerçekten ücretsiz mi | Orta | Yazılı teyit |
| Verimor paket fiyatı (liste vs e-posta çelişkisi) | Orta | Verimor'a soruldu |
| STT sağlayıcı ve fiyatı (Seçenek 2) | Orta | 2 günlük ölçüm |
| 2026 işveren maliyeti | Sadece karşılaştırma | Muhasebeden |

**Bu tabloyu teklifle birlikte vermeliyiz.** Rakamın arkasında ne
olduğunu göstermek, rakamı güçlendirir.

---

## 11. Önerimiz

1. **Bu belgeyi olduğu gibi paylaşın.** En kötü senaryoyu saklamak değil,
   göstermek güven veriyor. Klinik "ya tahmininiz şaşarsa" diye
   sorduğunda cevap elimizde olacak.

2. **Sabit aylık fiyat vermeyin.** Paket + aşım yapısı teklif edin.

3. **Kapsam sorusunu kliniğe geri sorun.** 7/24 mü, mesai dışı mı?
   Fark aylık 26.000 ₺ (beklenen) ile 126.000 ₺ (en kötü) arası.
   Bu kararı klinik versin.

4. **İlk ay ölçüm ayı olsun.** Verimor'un 15 günlük demosu taahhütsüz.
   Hattı bağlayıp gerçek çağrı sayısını ölçelim. Belirsizliğin en büyük
   kaynağı bir ayda kapanıyor.

5. **Tedarikçi fiyatlarını yazılı almadan sözleşme imzalamayın.**
   Eksik iki rakam: Twilio BYOC dakikası ve Verimor'un gelen dakika sözü.

---

## Ek — Hesabı kendiniz kontrol edebilirsiniz

`Deniz-Dent-Maliyet-Modeli.xlsx` → **"En Kotu Senaryo"** sayfası.
Üç kademe yan yana; sarı hücreler girdi, geri kalanı formül.
Bir varsayıma katılmıyorsanız o hücreyi değiştirin, tablo kendini
yeniden hesaplar.

**MİZ / My İnovatif Zeka · İzmir**
